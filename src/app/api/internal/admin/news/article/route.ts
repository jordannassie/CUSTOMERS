import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/require";

export const maxDuration = 90;

// Isolated to the Newsroom — does not affect the existing scan feature.
const NEWS_MODEL = process.env.OPENAI_NEWS_MODEL ?? "gpt-4o";

// Fields match exactly what NewsClient.tsx expects for GeneratedArticle.
export interface GeneratedArticle {
  category:         string;
  headline:         string;
  subheadline:      string;
  emailSubject:     string;
  previewText:      string;
  articleBody:      string;
  whyItMatters:     string;
  keyTakeaways:     string[];
  sources:          string;
  linkedinPost:     string;
  instagramCaption: string;
  imagePrompt:      string;
}

// Strict JSON Schema for the Responses API structured-output format.
const ARTICLE_SCHEMA = {
  type: "object",
  properties: {
    category:         { type: "string" },
    headline:         { type: "string" },
    subheadline:      { type: "string" },
    emailSubject:     { type: "string" },
    previewText:      { type: "string" },
    articleBody:      { type: "string" },
    whyItMatters:     { type: "string" },
    keyTakeaways:     { type: "array", items: { type: "string" } },
    sources:          { type: "string" },
    linkedinPost:     { type: "string" },
    instagramCaption: { type: "string" },
    imagePrompt:      { type: "string" },
  },
  required: [
    "category", "headline", "subheadline", "emailSubject", "previewText",
    "articleBody", "whyItMatters", "keyTakeaways", "sources",
    "linkedinPost", "instagramCaption", "imagePrompt",
  ],
  additionalProperties: false,
};

/**
 * Extract and parse JSON from model output.
 * Strips markdown fences if unexpectedly present, then finds the outermost object.
 */
function extractAndParseJson(raw: string): unknown {
  let text = raw.trim();

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

  return `Article generation failed (HTTP ${status}). Please try again.`;
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
  let body: {
    headline?:            unknown;
    whatIsNew?:           unknown;
    whatItHelpsDo?:       unknown;
    businessOpportunity?: unknown;
    howToTryIt?:          unknown;
    sourceUrl?:           unknown;
    sourceName?:          unknown;
    category?:            unknown;
    bestFor?:             unknown;
  };
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Invalid request body." }, { status: 400 }); }

  const headline            = typeof body.headline            === "string" ? body.headline.trim()            : "";
  const whatIsNew           = typeof body.whatIsNew           === "string" ? body.whatIsNew.trim()           : "";
  const whatItHelpsDo       = typeof body.whatItHelpsDo       === "string" ? body.whatItHelpsDo.trim()       : "";
  const businessOpportunity = typeof body.businessOpportunity === "string" ? body.businessOpportunity.trim() : "";
  const howToTryIt          = typeof body.howToTryIt          === "string" ? body.howToTryIt.trim()          : "";
  const sourceUrl           = typeof body.sourceUrl           === "string" ? body.sourceUrl.trim()           : "";
  const sourceName          = typeof body.sourceName          === "string" ? body.sourceName.trim()          : "";
  const category            = typeof body.category            === "string" ? body.category.trim()            : "AI Tools";
  const bestFor             = typeof body.bestFor             === "string" ? body.bestFor.trim()             : "";

  if (!headline) {
    return NextResponse.json({ error: "Headline is required." }, { status: 400 });
  }

  // ── Prompt ────────────────────────────────────────────────────────────────
  const prompt = `You are the senior editor of "Customers.Direct AI" — a newsletter for CEOs, founders, entrepreneurs, small-business owners, marketing executives, and sales leaders who want to use AI to grow faster.

EDITORIAL PROMISE: "Customers.Direct AI finds the AI news that helps business leaders get customers, grow revenue, save time and move faster."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STORY BRIEF:
Category: ${category}
Headline: ${headline}
What's New: ${whatIsNew}
What It Helps You Do: ${whatItHelpsDo}
Best For: ${bestFor}
Business Opportunity: ${businessOpportunity}
How to Try It: ${howToTryIt}
Primary Source: ${sourceName} — ${sourceUrl}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

YOUR TASK:
1. Use web search to read the primary source and up to 2 additional authoritative sources.
2. Verify all key facts, pricing, and product details before writing.
3. Write an ORIGINAL article for Customers.Direct AI. Do NOT copy or reword the source.

MANDATORY ARTICLE STRUCTURE — your articleBody must answer all 8 of these questions in order:
1. What was released or launched? (factual, specific, no hype)
2. What business problem does it solve? (practical framing for non-technical readers)
3. Who should use it? (specific roles: marketers, e-commerce founders, sales teams, agencies, etc.)
4. How can it generate revenue, attract customers, reduce costs or save time? (specific mechanisms)
5. How can someone begin using it today? (step-by-step or clear first action)
6. What is a realistic business example? (describe a real scenario, not hypothetical fluff)
7. What is the verified pricing, access and limitations? (be accurate; state if pricing was not found)
8. Is it genuinely worth trying? (honest, balanced recommendation)

WRITING REQUIREMENTS:
- Audience: CEOs, founders, marketers, sales leaders, entrepreneurs — NOT engineers or researchers
- Tone: Clear, energetic, practical, opportunity-focused — never condescending or overly technical
- Length: 650–900 words for articleBody
- Use short paragraphs (2–4 sentences max) and ## subheadings for each major section
- Do not write like a press release — write like a trusted business advisor explaining an opportunity
- No exaggerated promises, no fabricated quotes, no unsupported financial figures
- When something is inference or interpretation, say so clearly
- No generic AI filler phrases ("the future of AI", "game-changing", "revolutionary") unless directly quoting a source
- End with a specific, actionable recommendation

CONTENT RULES:
- Verify important claims before including them
- Attribute facts to sources inline: e.g. "According to [Source]..."
- Include source URLs in the sources field
- Never claim Customers.Direct independently tested anything
- State pricing accurately — if pricing is not publicly available, say so

SOCIAL COPY RULES:
- linkedinPost: Professional, 150–200 words, max 3 relevant hashtags, no clichés
- instagramCaption: Conversational, 80–120 words, 5–8 relevant hashtags at end

Return a JSON object with all 12 required fields. The articleBody must use ## subheadings and be in plain Markdown — no code fences inside the body. The keyTakeaways array must contain exactly 3 specific, actionable one-sentence strings aimed at business readers.`;

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
            name:   "generated_article",
            strict: true,
            schema: ARTICLE_SCHEMA,
          },
        },
        input: prompt,
      }),
      signal: AbortSignal.timeout(85_000),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("timeout") || msg.toLowerCase().includes("abort")) {
      return NextResponse.json({ error: "Article generation timed out. Please try again." }, { status: 504 });
    }
    console.error(`[news/article] fetch error: ${msg}`);
    return NextResponse.json({ error: "Could not reach OpenAI. Please try again." }, { status: 502 });
  }

  // ── HTTP error handling ───────────────────────────────────────────────────
  if (!res.ok) {
    const rawBody = await res.text();
    const reqId   = res.headers.get("x-request-id") ?? "—";
    console.error(
      `[news/article] OpenAI HTTP ${res.status} | req_id=${reqId} | preview=${rawBody.slice(0, 300)}`
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
      `[news/article] No output_text found | item_types=[${itemTypes.join(", ")}]`
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
  let parsed: GeneratedArticle;
  try {
    const result = extractAndParseJson(rawText) as GeneratedArticle;
    if (typeof result.headline !== "string" || typeof result.articleBody !== "string") {
      throw new Error("Required fields 'headline' or 'articleBody' are missing");
    }
    parsed = result;
  } catch (e) {
    const preview = rawText.slice(0, 400);
    console.error(
      `[news/article] JSON validation failed | error="${e}" | output_text_found=${outputTextFound} | preview=${JSON.stringify(preview)}`
    );
    return NextResponse.json(
      { error: "AI returned an unexpected response format. Please try again." },
      { status: 502 }
    );
  }

  // ── Normalise and return ──────────────────────────────────────────────────
  const article: GeneratedArticle = {
    category:         parsed.category         || category,
    headline:         parsed.headline         || headline,
    subheadline:      parsed.subheadline      || "",
    emailSubject:     parsed.emailSubject     || "",
    previewText:      parsed.previewText      || "",
    articleBody:      parsed.articleBody      || "",
    whyItMatters:     parsed.whyItMatters     || "",
    keyTakeaways:     Array.isArray(parsed.keyTakeaways) ? parsed.keyTakeaways.slice(0, 3) : [],
    sources:          parsed.sources          || "",
    linkedinPost:     parsed.linkedinPost     || "",
    instagramCaption: parsed.instagramCaption || "",
    imagePrompt:      parsed.imagePrompt      || "",
  };

  return NextResponse.json({ article });
}
