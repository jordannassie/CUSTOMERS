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
  rank:                number;
  headline:            string;
  category:            string;
  whatIsNew:           string;
  whatItHelpsDo:       string;
  bestFor:             string;
  businessOpportunity: string;
  howToTryIt:          string;
  sourceName:          string;
  sourceUrl:           string;
  publishedAt:         string | null;
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
          rank:                { type: "number" },
          headline:            { type: "string" },
          category:            { type: "string" },
          whatIsNew:           { type: "string" },
          whatItHelpsDo:       { type: "string" },
          bestFor:             { type: "string" },
          businessOpportunity: { type: "string" },
          howToTryIt:          { type: "string" },
          sourceName:          { type: "string" },
          sourceUrl:           { type: "string" },
          publishedAt:         { anyOf: [{ type: "string" }, { type: "null" }] },
        },
        required: [
          "rank", "headline", "category", "whatIsNew", "whatItHelpsDo",
          "bestFor", "businessOpportunity", "howToTryIt",
          "sourceName", "sourceUrl", "publishedAt",
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
  const prompt = `You are the editorial AI for "Customers.Direct AI" — a newsletter written exclusively for CEOs, founders, entrepreneurs, small-business owners, marketing executives, marketing agencies, sales leaders, and business-development professionals who want to use AI to grow faster.

EDITORIAL PROMISE:
"Customers.Direct AI finds the AI news that helps business leaders get customers, grow revenue, save time and move faster."

YOUR TASK:
Search the web for AI news published in the ${periodLabel}. Identify the stories that best help the target reader. Return up to 10 qualifying stories, ranked by business value.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WHAT THE TARGET READER WANTS TO KNOW:
- How can AI help me grow my company?
- How can AI help me get more customers?
- How can AI improve my marketing or advertising?
- How can AI improve sales and lead generation?
- How can AI save my team time or reduce costs?
- What new tool or feature should I try right now?
- How can I use AI to start or grow a business?
- What are successful companies doing with AI?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PRIORITY TOPICS (in order):
1. New AI tools for business, marketing or sales
2. New features in ChatGPT, Claude, Gemini, and major AI products used by businesses
3. AI marketing, advertising, and content tools
4. AI sales, CRM, and lead-generation tools
5. AI customer-acquisition tools
6. AI automation tools that replace repetitive tasks
7. AI productivity tools for business teams
8. AI agents for business workflows
9. AI website, e-commerce, and app builders
10. New ways to make money or launch a business using AI
11. Real business case studies using AI
12. AI workflows that reduce costs or save time
13. Free tools, trials, and meaningful product offers
14. AI developments that create a clear business opportunity

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
COMPLETELY EXCLUDE the following categories — do not include even one story from these areas:
- AI safety reports, AI alignment, model deception, jailbreaking, or red-teaming
- Government regulation or political debates about AI
- Academic research papers or technical benchmarks
- Model architecture, infrastructure, data centers, chips, or hardware
- Corporate geographic expansion announcements
- Executive appointments or departures
- Corporate lawsuits or legal disputes
- General funding rounds or corporate earnings with no direct product benefit for businesses
- Market-share statistics or analyst reports
- Cybersecurity incidents or technical postmortems
- Education deployments (unless directly relevant to business training)
- Stories that are only interesting to AI engineers, researchers, investors, or policymakers
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

MANDATORY QUALIFICATION TEST:
Before including any story, confirm you can complete this sentence with a specific, credible benefit:
"This helps a CEO, marketer or entrepreneur ___________."

If the blank cannot be filled with a specific, practical benefit — exclude the story.

Do not pad the list to reach 10 results. Return fewer high-quality stories rather than weak ones. If there are not 10 qualifying stories in the ${periodLabel}, expand your search window slightly or return fewer stories.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
INTERNAL SCORING (rank stories by total score):
- Revenue-growth potential
- Customer-acquisition value
- Marketing usefulness
- Sales usefulness
- Time-saving potential
- Cost-saving potential
- Entrepreneurial opportunity
- Ease of implementation for non-technical users
- Relevance to businesspeople (not engineers)
- Strength and credibility of the source
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

QUALITY RULES:
- Favor primary sources: official company blogs, product announcements, company newsrooms
- Use reputable journalism only when no primary source is available
- Every sourceUrl must be a real, verifiable URL from your web search results
- Do NOT invent URLs, publication dates, facts, or quotations
- Do NOT include rumors, content farms, or unsupported social-media posts

CATEGORIES (pick the most accurate one per story):
AI Tools | AI Marketing | AI Sales | AI Productivity | AI Agents | AI Content | AI E-commerce | Business AI | New Features | Automation

FOR EACH STORY PROVIDE:
- headline: A benefit-driven headline written for a business reader (not a press-release title)
- whatIsNew: 2 sentences explaining what was released or announced
- whatItHelpsDo: A direct verb phrase describing the business action this enables (e.g. "Find more qualified leads", "Create advertisements faster", "Automate customer follow-up", "Build a website without coding")
- bestFor: The specific business role or business type that benefits most (e.g. "Marketing agencies", "E-commerce founders", "Sales teams under 10 people")
- businessOpportunity: 2–3 sentences on the specific revenue, customer-acquisition, cost-saving, or time-saving opportunity this creates
- howToTryIt: One sentence describing the quickest way to access or try this (include URL if known)
- sourceName, sourceUrl, publishedAt (ISO 8601 or null), category, rank

Return a JSON object with a "stories" array.`;

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
      rank:                typeof s.rank === "number" ? s.rank : i + 1,
      headline:            s.headline            ?? "",
      category:            s.category            ?? "AI Tools",
      whatIsNew:           s.whatIsNew           ?? "",
      whatItHelpsDo:       s.whatItHelpsDo       ?? "",
      bestFor:             s.bestFor             ?? "",
      businessOpportunity: s.businessOpportunity ?? "",
      howToTryIt:          s.howToTryIt          ?? "",
      sourceName:          s.sourceName          ?? "",
      sourceUrl:           s.sourceUrl           ?? "",
      publishedAt:         s.publishedAt         ?? null,
    }));

  return NextResponse.json({ stories, period });
}
