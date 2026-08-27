import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/require";

export const maxDuration = 60;

type Period = "24h" | "48h" | "7d";

const PERIOD_LABELS: Record<Period, string> = {
  "24h": "last 24 hours",
  "48h": "last 48 hours",
  "7d":  "last 7 days",
};

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

function extractJson(text: string): string {
  // Try to find JSON object in the response text
  const start = text.indexOf("{");
  const end   = text.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON object found in response");
  return text.slice(start, end + 1);
}

export async function POST(request: NextRequest) {
  // Admin-only
  try { await requireAdmin(); }
  catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OpenAI API key is not configured." }, { status: 503 });
  }

  let body: { period?: unknown };
  try { body = await request.json(); }
  catch { body = {}; }

  const period: Period = (["24h", "48h", "7d"].includes(body.period as string)
    ? body.period
    : "24h") as Period;
  const periodLabel = PERIOD_LABELS[period];

  const prompt = `You are an expert AI journalist and news researcher. Search the web for the 10 most important AI news stories from the ${periodLabel}.

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
- Every URL must be a real, verifiable source from your web search
- Exclude duplicate stories covering the same event
- Rank by importance and usefulness to business professionals

Return ONLY valid JSON — no explanation, no markdown fences, no other text. Use exactly this structure:

{
  "stories": [
    {
      "rank": 1,
      "headline": "Exact headline of the story",
      "summary": "Two-sentence factual summary.",
      "whyItMatters": "One or two sentences on why this matters to business professionals.",
      "category": "one of: AI News | New Models | AI Tools | Business | Research | Funding | Regulation | Safety",
      "sourceName": "Publication or company name",
      "sourceUrl": "https://exact-real-url-from-search.com/article",
      "publishedAt": "ISO 8601 date string or null",
      "suggestedAngle": "A specific editorial angle for Customers.Direct AI newsletter"
    }
  ]
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
      signal: AbortSignal.timeout(55_000),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("[news/search] OpenAI error:", res.status, text.slice(0, 400));
      return NextResponse.json(
        { error: "AI search failed. Please try again." },
        { status: 502 }
      );
    }

    const data = await res.json();

    // Extract text from the Responses API output
    let rawText = "";
    for (const item of data.output ?? []) {
      if (item.type === "message") {
        for (const block of item.content ?? []) {
          if (block.type === "output_text") rawText += block.text;
        }
      }
    }

    if (!rawText) {
      return NextResponse.json({ error: "No content returned from AI search." }, { status: 502 });
    }

    // Parse JSON from response
    let parsed: { stories: NewsStory[] };
    try {
      const jsonStr = extractJson(rawText);
      parsed = JSON.parse(jsonStr);
    } catch (e) {
      console.error("[news/search] JSON parse error:", e, "raw:", rawText.slice(0, 500));
      return NextResponse.json(
        { error: "Could not parse AI response. Please try again." },
        { status: 502 }
      );
    }

    const stories: NewsStory[] = (parsed.stories ?? [])
      .slice(0, 10)
      .map((s, i) => ({
        rank:           s.rank ?? i + 1,
        headline:       s.headline ?? "",
        summary:        s.summary ?? "",
        whyItMatters:   s.whyItMatters ?? "",
        category:       s.category ?? "AI News",
        sourceName:     s.sourceName ?? "",
        sourceUrl:      s.sourceUrl ?? "",
        publishedAt:    s.publishedAt ?? null,
        suggestedAngle: s.suggestedAngle ?? "",
      }));

    return NextResponse.json({ stories, period });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[news/search] error:", msg);
    if (msg.includes("timeout") || msg.includes("abort")) {
      return NextResponse.json({ error: "Search timed out. Please try again." }, { status: 504 });
    }
    return NextResponse.json({ error: "Search failed. Please try again." }, { status: 500 });
  }
}
