import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/require";

export const maxDuration = 90;

type Weekday = "monday" | "tuesday" | "wednesday" | "thursday" | "friday";

const NEWS_MODEL = process.env.OPENAI_NEWS_MODEL ?? "gpt-4o";

const WEEKDAY_WRITING_ANGLE: Record<Weekday, string> = {
  monday:    "Share a verified AI search development and explain clearly what it means for the agency's clients — what has changed, why it matters for brand visibility, and what they should do next.",
  tuesday:   "Help agency owners think about client-versus-competitor AI visibility. Use this development as a reason to check where clients appear in AI answers compared to competitors, and what a visibility gap looks like in practice.",
  wednesday: "Position AEO (Answer Engine Optimisation) as a valuable client service. Use this development to explain why agencies should be offering AI visibility work to clients, and give them 2–3 practical service-scoping ideas.",
  thursday:  "Provide a practical reporting angle. Use this development to share an audit step, visibility metric, or client-reporting approach agencies can use right now to show clients where they stand in AI search.",
  friday:    "Share a workflow or tool that helps agencies manage AI visibility for multiple clients more efficiently. Use this development to explain a practical process agencies can start implementing today.",
};

// Fields the client renders
export interface GeneratedArticle {
  // PRIMARY — LinkedIn post (main output)
  linkedinPost:     string;
  imagePrompt:      string;
  sources:          string;  // verified source links, separate from post

  // SECONDARY — newsletter briefing (collapsed section)
  category:         string;
  headline:         string;
  subheadline:      string;
  emailSubject:     string;
  previewText:      string;
  articleBody:      string;
  whyItMatters:     string;
  keyTakeaways:     string[];
  instagramCaption: string;
}

const ARTICLE_SCHEMA = {
  type: "object",
  properties: {
    linkedinPost:     { type: "string" },
    imagePrompt:      { type: "string" },
    sources:          { type: "string" },
    category:         { type: "string" },
    headline:         { type: "string" },
    subheadline:      { type: "string" },
    emailSubject:     { type: "string" },
    previewText:      { type: "string" },
    articleBody:      { type: "string" },
    whyItMatters:     { type: "string" },
    keyTakeaways:     { type: "array", items: { type: "string" } },
    instagramCaption: { type: "string" },
  },
  required: [
    "linkedinPost", "imagePrompt", "sources",
    "category", "headline", "subheadline", "emailSubject", "previewText",
    "articleBody", "whyItMatters", "keyTakeaways", "instagramCaption",
  ],
  additionalProperties: false,
};

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
  if (start === -1 || end === -1 || end <= start)
    throw new Error(`No JSON object found. Preview: ${JSON.stringify(text.slice(0, 300))}`);
  return JSON.parse(text.slice(start, end + 1));
}

function classifyOpenAIError(status: number, body: string): string {
  if (status === 401) return "OpenAI authentication failed. Check your API key configuration.";
  if (status === 429) return "OpenAI rate limit reached. Please try again in a moment.";
  if (status === 503 || status === 502) return "OpenAI is temporarily unavailable. Please try again.";
  try {
    const parsed = JSON.parse(body) as { error?: { code?: string; message?: string } };
    const code   = parsed?.error?.code    ?? "";
    const msg    = parsed?.error?.message ?? "";
    if (code === "model_not_found" || msg.includes("model"))
      return `Model "${NEWS_MODEL}" not found. Set OPENAI_NEWS_MODEL to a compatible model.`;
    if (code === "unsupported_value" || msg.toLowerCase().includes("tool"))
      return `Web search is not supported for model "${NEWS_MODEL}". Try a different model via OPENAI_NEWS_MODEL.`;
    if (msg) return `OpenAI error: ${msg.slice(0, 250)}`;
  } catch { /* not JSON */ }
  return `Generation failed (HTTP ${status}). Please try again.`;
}

export async function POST(request: NextRequest) {
  try { await requireAdmin(); }
  catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OpenAI API key is not configured." }, { status: 503 });
  }

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
    weekday?:             unknown;
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
  const category            = typeof body.category            === "string" ? body.category.trim()            : "AI Search";
  const bestFor             = typeof body.bestFor             === "string" ? body.bestFor.trim()             : "";
  const weekday: Weekday    = (
    ["monday", "tuesday", "wednesday", "thursday", "friday"].includes(body.weekday as string)
      ? body.weekday : "monday"
  ) as Weekday;

  if (!headline) return NextResponse.json({ error: "Headline is required." }, { status: 400 });

  const writingAngle = WEEKDAY_WRITING_ANGLE[weekday];

  const prompt = `You are writing LinkedIn content for Jordan Nassie, founder of Customers.Direct — a platform that helps marketing agencies compare their clients' AI search visibility against competitors.

THE AUDIENCE: Marketing agency owners, SEO directors, and client strategy teams.
THE CONVERSION GOAL: Get agencies to compare their client's AI visibility against a competitor at https://customers.direct/

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
NEWS STORY BRIEF:
Category: ${category}
Headline: ${headline}
What's New: ${whatIsNew}
Why Agencies Should Care: ${whatItHelpsDo}
What It Means for Clients: ${bestFor}
Suggested Angle: ${businessOpportunity}
Practical First Step: ${howToTryIt}
Primary Source: ${sourceName} — ${sourceUrl}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

STEP 1 — RESEARCH:
Use web search to read the primary source and up to 2 authoritative additional sources.
Verify all key facts before writing. Note verified source URLs for the sources field.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 2 — WRITE THE LINKEDIN POST (primary output):

TODAY'S WRITING ANGLE: ${writingAngle}

VOICE AND FRAMING:
- Write AS Jordan Nassie, first-person, founder of Customers.Direct.
- Speak directly to marketing agency owners and SEO directors.
- Tone: direct, knowledgeable, genuine. No hype, no fluff, no corporate-speak.

STRUCTURE (follow this exactly, no section labels in the post):
1. Opening hook — 1–2 specific, attention-grabbing lines about the development. Make it concrete, not vague.
2. Brief explanation — what actually happened or changed (2–3 sentences from verified sources).
3. Why it matters for agencies — how this affects the clients they manage.
4. 2–3 practical insights or actions tied to today's writing angle (${writingAngle.split(".")[0]}).
5. Natural transition to comparing client AI visibility against competitors.
6. EXACT final CTA (copy this word-for-word, no changes):
   Comment AEO and I'll send you the link to compare your client's AI visibility against a competitor.

STYLE RULES:
- 150–220 words total. Must stay comfortably below 3,000 characters.
- Short paragraphs with blank lines between them.
- Plain text only — no Markdown, no bold asterisks, no headings, no bullet markers, no numbered lists.
- No labels like "Hook:", "CTA:", "Body:" in the post.
- No "In conclusion," or generic closing phrases.
- No exaggerated urgency ("You MUST do this NOW").
- No fabricated statistics, testimonials, customer results, or first-person experiences Jordan didn't have.
- Do NOT claim Jordan tested or used anything unless you have evidence.
- Hypothetical examples are fine but must be clearly framed as hypothetical.
- No additional CTA or direct link to customers.direct inside the post itself.
- No hashtags anywhere in the post.
- Attribute news naturally inline (e.g. "According to [Source]...").
- The exact "Comment AEO" CTA must be the ONLY call-to-action and the final line.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 3 — WRITE THE IMAGE PROMPT:

Write a standalone prompt for generating a 1080×1080 LinkedIn image in ChatGPT or Midjourney.
The image should visually support this specific post and writing angle.

Image prompt requirements:
- Strong focal point, clean composition, clear visual hierarchy.
- Suggest including footer text: "Comment AEO for the link."
- Minimal text in the image.
- No charts, dashboard screenshots, visibility scores, customer logos, revenue claims, or fabricated data.
- Professional, agency-appropriate aesthetic.
- No stock-photo clichés (no handshakes, no generic light bulbs).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 4 — SOURCES FIELD:
List each verified source as: Title — URL — Published [date or "date not confirmed"].
Distinguish verified facts from your interpretation.
Keep source links separate from the copyable post text.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 5 — NEWSLETTER BRIEFING (secondary output, not the main product):

Also provide a shorter newsletter-style briefing:
- headline: Agency-focused headline for this story
- subheadline: One-sentence elaboration
- emailSubject: Newsletter subject line
- previewText: 100-character preview text
- articleBody: 400–600 word briefing with ## subheadings, written for agency owners
- whyItMatters: 2-sentence summary of agency relevance
- keyTakeaways: Exactly 3 specific, actionable one-sentence strings for agency owners
- instagramCaption: 80–120 words, conversational, 5–8 hashtags at end

Return a JSON object with all required fields.
The linkedinPost field is the primary deliverable — it must follow all structure and style rules above exactly.`;

  let res: Response;
  try {
    res = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: NEWS_MODEL,
        tools: [{ type: "web_search" }],
        text: {
          format: {
            type: "json_schema",
            name: "generated_article",
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
    if (msg.includes("timeout") || msg.toLowerCase().includes("abort"))
      return NextResponse.json({ error: "Generation timed out. Please try again." }, { status: 504 });
    console.error(`[news/article] fetch error: ${msg}`);
    return NextResponse.json({ error: "Could not reach OpenAI. Please try again." }, { status: 502 });
  }

  if (!res.ok) {
    const rawBody = await res.text();
    console.error(`[news/article] OpenAI HTTP ${res.status} | preview=${rawBody.slice(0, 300)}`);
    return NextResponse.json({ error: classifyOpenAIError(res.status, rawBody) }, { status: 502 });
  }

  const data = await res.json() as {
    output?: Array<{ type: string; content?: Array<{ type: string; text: string }> }>;
  };

  const itemTypes: string[] = [];
  let rawText = "";
  let outputTextFound = false;

  for (const item of (data.output ?? [])) {
    itemTypes.push(item.type);
    if (item.type === "message") {
      for (const block of (item.content ?? [])) {
        if (block.type === "output_text") { rawText += block.text; outputTextFound = true; }
      }
    }
  }

  if (!outputTextFound) {
    console.error(`[news/article] No output_text | item_types=[${itemTypes.join(", ")}]`);
    return NextResponse.json({
      error: itemTypes.length === 0
        ? "OpenAI returned an empty response. Please try again."
        : `No text output (types: ${itemTypes.join(", ")}). Please try again.`,
    }, { status: 502 });
  }

  let parsed: GeneratedArticle;
  try {
    const result = extractAndParseJson(rawText) as GeneratedArticle;
    if (typeof result.linkedinPost !== "string" || !result.linkedinPost)
      throw new Error("Required field 'linkedinPost' is missing");
    parsed = result;
  } catch (e) {
    console.error(`[news/article] JSON parse failed: ${e} | preview=${rawText.slice(0, 400)}`);
    return NextResponse.json({ error: "AI returned an unexpected format. Please try again." }, { status: 502 });
  }

  const article: GeneratedArticle = {
    linkedinPost:     parsed.linkedinPost     || "",
    imagePrompt:      parsed.imagePrompt      || "",
    sources:          parsed.sources          || "",
    category:         parsed.category         || category,
    headline:         parsed.headline         || headline,
    subheadline:      parsed.subheadline      || "",
    emailSubject:     parsed.emailSubject     || "",
    previewText:      parsed.previewText      || "",
    articleBody:      parsed.articleBody      || "",
    whyItMatters:     parsed.whyItMatters     || "",
    keyTakeaways:     Array.isArray(parsed.keyTakeaways) ? parsed.keyTakeaways.slice(0, 3) : [],
    instagramCaption: parsed.instagramCaption || "",
  };

  return NextResponse.json({ article });
}
