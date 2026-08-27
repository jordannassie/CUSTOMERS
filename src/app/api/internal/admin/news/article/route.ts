import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/require";

export const maxDuration = 90;

export interface GeneratedArticle {
  category: string;
  headline: string;
  subheadline: string;
  emailSubject: string;
  previewText: string;
  articleBody: string;
  whyItMatters: string;
  keyTakeaways: string[];
  sources: string;
  linkedinPost: string;
  instagramCaption: string;
  imagePrompt: string;
}

function extractJson(text: string): string {
  const start = text.indexOf("{");
  const end   = text.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON object found in response");
  return text.slice(start, end + 1);
}

export async function POST(request: NextRequest) {
  try { await requireAdmin(); }
  catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OpenAI API key is not configured." }, { status: 503 });
  }

  let body: {
    headline?: unknown;
    summary?: unknown;
    whyItMatters?: unknown;
    sourceUrl?: unknown;
    sourceName?: unknown;
    category?: unknown;
    suggestedAngle?: unknown;
  };
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Invalid request body." }, { status: 400 }); }

  const headline      = typeof body.headline      === "string" ? body.headline.trim()      : "";
  const summary       = typeof body.summary       === "string" ? body.summary.trim()       : "";
  const whyItMatters  = typeof body.whyItMatters  === "string" ? body.whyItMatters.trim()  : "";
  const sourceUrl     = typeof body.sourceUrl     === "string" ? body.sourceUrl.trim()     : "";
  const sourceName    = typeof body.sourceName    === "string" ? body.sourceName.trim()    : "";
  const category      = typeof body.category      === "string" ? body.category.trim()      : "AI News";
  const suggestedAngle = typeof body.suggestedAngle === "string" ? body.suggestedAngle.trim() : "";

  if (!headline) {
    return NextResponse.json({ error: "Headline is required." }, { status: 400 });
  }

  const prompt = `You are the senior editor of "Customers.Direct AI," a professional newsletter for business owners and professionals who want to use AI to grow their businesses.

STORY BRIEF:
Headline: ${headline}
Summary: ${summary}
Why It Matters: ${whyItMatters}
Primary Source: ${sourceName} — ${sourceUrl}
Category: ${category}
Suggested Angle: ${suggestedAngle}

YOUR TASK:
1. Use web search to read the primary source and, where helpful, 1–2 additional authoritative sources.
2. Verify the key facts before writing.
3. Write an ORIGINAL article for Customers.Direct AI. Do NOT copy or lightly reword the source.

WRITING REQUIREMENTS:
- Audience: business owners and professionals who want to use AI practically
- Tone: Clear, energetic, professional, useful — not overly technical
- Length: 600–900 words for the article body
- Use short paragraphs (2–4 sentences max) and useful subheadings (##)
- Explain WHY the development matters to business professionals specifically
- No exaggerated promises, no fabricated quotes, no unsupported financial figures
- Make clear when something is inference or interpretation
- Do not reproduce long passages from the source
- No generic AI filler phrases or repetitive conclusions

CONTENT REQUIREMENTS:
- Verify important claims before including them
- Attribute facts to sources inline where relevant
- Include clickable source URLs in the SOURCES field
- Never claim Customers.Direct independently tested anything
- The headline should be compelling but strictly truthful

Return ONLY valid JSON — no explanation, no markdown fences, nothing else. Use exactly this structure:

{
  "category": "same category as input",
  "headline": "Compelling, truthful headline (max 80 chars)",
  "subheadline": "One-sentence subheadline expanding on the headline",
  "emailSubject": "Beehiiv email subject line — punchy, under 60 chars",
  "previewText": "Beehiiv preview text — one sentence, under 140 chars",
  "articleBody": "Full article body in clean Markdown with ## subheadings and short paragraphs. No code fences. 600-900 words.",
  "whyItMatters": "2-3 sentences specifically about why this matters for business owners using AI.",
  "keyTakeaways": [
    "First key takeaway — one sentence, actionable",
    "Second key takeaway — one sentence, actionable",
    "Third key takeaway — one sentence, actionable"
  ],
  "sources": "Formatted source list with names and URLs, one per line",
  "linkedinPost": "LinkedIn post — professional, 150-200 words, no hashtag spam, 2-3 relevant hashtags max",
  "instagramCaption": "Instagram caption — conversational, 80-120 words, 5-8 relevant hashtags at the end",
  "imagePrompt": "Premium 16:9 editorial AI-news illustration prompt for an image generator. Describe scene, mood, style. No embedded text in the image unless essential. Cinematic, professional quality."
}`;

  try {
    const res = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model:   "gpt-4o",
        tools:   [{ type: "web_search_preview" }],
        input:   prompt,
      }),
      signal: AbortSignal.timeout(85_000),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("[news/article] OpenAI error:", res.status, text.slice(0, 400));
      return NextResponse.json(
        { error: "Article generation failed. Please try again." },
        { status: 502 }
      );
    }

    const data = await res.json();

    let rawText = "";
    for (const item of data.output ?? []) {
      if (item.type === "message") {
        for (const block of item.content ?? []) {
          if (block.type === "output_text") rawText += block.text;
        }
      }
    }

    if (!rawText) {
      return NextResponse.json({ error: "No content returned from AI." }, { status: 502 });
    }

    let parsed: GeneratedArticle;
    try {
      const jsonStr = extractJson(rawText);
      parsed = JSON.parse(jsonStr);
    } catch (e) {
      console.error("[news/article] JSON parse error:", e, "raw:", rawText.slice(0, 500));
      return NextResponse.json(
        { error: "Could not parse AI response. Please try again." },
        { status: 502 }
      );
    }

    const article: GeneratedArticle = {
      category:       parsed.category       || category,
      headline:       parsed.headline       || headline,
      subheadline:    parsed.subheadline    || "",
      emailSubject:   parsed.emailSubject   || "",
      previewText:    parsed.previewText    || "",
      articleBody:    parsed.articleBody    || "",
      whyItMatters:   parsed.whyItMatters   || "",
      keyTakeaways:   Array.isArray(parsed.keyTakeaways) ? parsed.keyTakeaways.slice(0, 3) : [],
      sources:        parsed.sources        || "",
      linkedinPost:   parsed.linkedinPost   || "",
      instagramCaption: parsed.instagramCaption || "",
      imagePrompt:    parsed.imagePrompt    || "",
    };

    return NextResponse.json({ article });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[news/article] error:", msg);
    if (msg.includes("timeout") || msg.includes("abort")) {
      return NextResponse.json({ error: "Article generation timed out. Please try again." }, { status: 504 });
    }
    return NextResponse.json({ error: "Article generation failed. Please try again." }, { status: 500 });
  }
}
