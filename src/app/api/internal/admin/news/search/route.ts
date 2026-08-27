import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/require";

export const maxDuration = 60;

type Period = "24h" | "48h" | "7d";

const PERIOD_LABELS: Record<Period, string> = {
  "24h": "last 24 hours",
  "48h": "last 48 hours",
  "7d":  "last 7 days",
};

// Isolated to the Newsroom — does not affect the existing scan feature.
const NEWS_MODEL = process.env.OPENAI_NEWS_MODEL ?? "gpt-4o";

export interface NewsStory {
  rank: number;
  headline: string;
  summary: string;
  whyItMatters: string;
  category: string;
  sourceName: string;
  sourceUrl: string;
  publishedAt: string | null;
  suggestedAngle: string;
}

// Strict JSON Schema for the Responses API structured-output format.
// anyOf is required for nullable fields in strict mode.
const STORIES_SCHEMA = {
  type: "object",
  properties: {
    stories: {
      type: "array",
      items: {
        type: "object",
        properties: {
          rank:           { type: "number" },
          headline:       { type: "string" },
          summary:        { type: "string" },
          whyItMatters:   { type: "string" },
          sourceName:     { type: "string" },
          sourceUrl:      { type: "string" },
          publishedAt:    { anyOf: [{ type: "string" }, { type: "null" }] },
          category:       { type: "string" },
          suggestedAngle: { type: "string" },
        },
        required: [
          "rank", "headline", "summary", "whyItMatters",
          "sourceName", "sourceUrl", "publishedAt", "category", "suggestedAngle",
        ],
        additionalProperties: false,
      },
    },
  },
  required: ["stories"],
  additionalProperties: false,
};

/**
 * Extract and parse JSON from model output.
 * Strips markdown fences if unexpectedly present, then finds the outermost object.
 */
function extractAndParseJson(raw: string): unknown {
  let text = raw.trim();

  // Strip ``` or ```json fences
  if (text.startsWith("```")) {
    const nl = text.indexOf("\n");
    text = nl !== -1 ? text.slice(nl + 1) : text.slice(3);
    const close = text.lastIndexOf("```");
    if (close !== -1) text = text.slice(0, close);
    text = text.trim();
  }

  // Locate the outermost JSON object
  const start = text.indexOf("{");
  const end   = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error(`No JSON object found. Preview: ${JSON.stringify(text.slice(0, 300))}`);
  }

  return JSON.parse(text.slice(start, end + 1));
}

/** Map OpenAI HTTP error status and body to a clear user-facing message. */
function classifyOpenAIError(status: number, body: string): string {
  if (status === 401) return "OpenAI authentication failed. Check your API key configuration.";
  if (status === 429) return "OpenAI rate limit reached. Please try again in a moment.";
  if (status === 503 || status === 502) return "OpenAI is temporarily unavailable. Please try again.";

  try {
    const parsed = JSON.parse(body) as { error?: { code?: string; message?: string } };
    const code   = parsed?.error?.code    ?? "";
    const msg    = parsed?.error?.message ?? "";
    if (code === "model_not_found" || msg.includes("model")) {
      return `Model "${NEWS_MODEL}" not found or doesn't support web search. Set OPENAI_NEWS_MODEL to a compatible model.`;
    }
    if (code === "unsupported_value" || msg.toLowerCase().includes("tool")) {
      return `Web search tool is not supported for model "${NEWS_MODEL}". Try a different model via OPENAI_NEWS_MODEL.`;
    }
    if (msg) return `OpenAI error: ${msg.slice(0, 250)}`;
  } catch { /* body was not JSON */ }

  return `AI search failed (HTTP ${status}). Please try again.`;
}

export async function POST(request: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  try { await requireAdmin(); }
  catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

  // ── Config ────────────────────────────────────────────────────────────────
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OpenAI API key is not configured. Add OPENAI_API_KEY to your environment." },
      { status: 503 }
    );
  }

  // ── Request body ──────────────────────────────────────────────────────────
  let body: { period?: unknown };
  try { body = await request.json(); }
  catch { body = {}; }

  const period: Period = (["24h", "48h", "7d"].includes(body.period as string)
    ? body.period
    : "24h") as Period;
  const periodLabel = PERIOD_LABELS[period];

  // ── Prompt ────────────────────────────────────────────────────────────────
  const prompt = `You are an expert AI journalist and news researcher. Search the web and find the 10 most important AI news stories published in the ${periodLabel}.

SEARCH PRIORITIES (in order):
- OpenAI, Anthropic, Google/DeepMind, Microsoft, Meta, xAI, NVIDIA
- New AI model launches and major product releases
- Important AI business announcements, funding, acquisitions, partnerships
- AI tools useful to business professionals
- Meaningful AI research breakthroughs
- Major AI safety or regulation developments

QUALITY RULES:
- Favor primary sources: official company blogs, research papers, company newsrooms
- Use reputable journalism only when no primary source is available
- Do NOT include rumors, content farms, unsupported social posts, or duplicate stories
- Do NOT invent URLs, publication dates, facts, or quotations
- Every sourceUrl must be a real, verifiable URL from your web search results
- Exclude duplicate stories covering the same event
- Rank by importance and usefulness to business professionals

Return a JSON object with a "stories" array containing exactly 10 items (or fewer only if legitimate results are genuinely scarce). Each item must have all required fields populated.`;

  // ── OpenAI request ────────────────────────────────────────────────────────
  let res: Response;
  try {
    res = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: NEWS_MODEL,
        tools: [{ type: "web_search" }],
        // Force structured JSON output — prevents markdown fences and prose wrapping.
        text: {
          format: {
            type:   "json_schema",
            name:   "news_stories",
            strict: true,
            schema: STORIES_SCHEMA,
          },
        },
        input: prompt,
      }),
      signal: AbortSignal.timeout(55_000),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("timeout") || msg.toLowerCase().includes("abort")) {
      return NextResponse.json({ error: "Search timed out. Please try again." }, { status: 504 });
    }
    console.error(`[news/search] fetch error: ${msg}`);
    return NextResponse.json({ error: "Could not reach OpenAI. Please try again." }, { status: 502 });
  }

  // ── HTTP error handling ───────────────────────────────────────────────────
  if (!res.ok) {
    const rawBody = await res.text();
    const reqId   = res.headers.get("x-request-id") ?? "—";
    console.error(
      `[news/search] OpenAI HTTP ${res.status} | req_id=${reqId} | preview=${rawBody.slice(0, 300)}`
    );
    return NextResponse.json(
      { error: classifyOpenAIError(res.status, rawBody) },
      { status: 502 }
    );
  }

  // ── Extract output_text ───────────────────────────────────────────────────
  const data = await res.json() as {
    output?: Array<{
      type: string;
      content?: Array<{ type: string; text: string }>;
    }>;
  };

  const itemTypes: string[]  = [];
  let rawText                = "";
  let outputTextFound        = false;

  for (const item of (data.output ?? [])) {
    itemTypes.push(item.type);
    if (item.type === "message") {
      for (const block of (item.content ?? [])) {
        if (block.type === "output_text") {
          rawText        += block.text;
          outputTextFound = true;
        }
      }
    }
  }

  if (!outputTextFound) {
    console.error(
      `[news/search] No output_text found | item_types=[${itemTypes.join(", ")}]`
    );
    return NextResponse.json(
      {
        error: itemTypes.length === 0
          ? "OpenAI returned an empty response. Please try again."
          : `No text output from AI (output types: ${itemTypes.join(", ")}). Please try again.`,
      },
      { status: 502 }
    );
  }

  // ── Parse and validate JSON ───────────────────────────────────────────────
  let parsed: { stories?: unknown[] };
  try {
    parsed = extractAndParseJson(rawText) as { stories?: unknown[] };
    if (!Array.isArray(parsed.stories)) {
      throw new Error("'stories' field is missing or not an array");
    }
  } catch (e) {
    const preview = rawText.slice(0, 400);
    console.error(
      `[news/search] JSON validation failed | error="${e}" | output_text_found=${outputTextFound} | preview=${JSON.stringify(preview)}`
    );
    return NextResponse.json(
      { error: "AI returned an unexpected response format. Please try again." },
      { status: 502 }
    );
  }

  // ── Normalise and return ──────────────────────────────────────────────────
  const stories: NewsStory[] = (parsed.stories as Partial<NewsStory>[])
    .slice(0, 10)
    .map((s, i) => ({
      rank:           typeof s.rank === "number" ? s.rank : i + 1,
      headline:       s.headline       ?? "",
      summary:        s.summary        ?? "",
      whyItMatters:   s.whyItMatters   ?? "",
      category:       s.category       ?? "AI News",
      sourceName:     s.sourceName     ?? "",
      sourceUrl:      s.sourceUrl      ?? "",
      publishedAt:    s.publishedAt    ?? null,
      suggestedAngle: s.suggestedAngle ?? "",
    }));

  return NextResponse.json({ stories, period });
}
