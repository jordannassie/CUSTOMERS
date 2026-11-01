import { NextRequest, NextResponse } from "next/server";
import { authErrorResponse, requireAdmin } from "@/modules/auth";
import { askNewsModel } from "@/modules/news";

export const maxDuration = 60;

type Period   = "24h" | "48h" | "7d";
type Weekday  = "monday" | "tuesday" | "wednesday" | "thursday" | "friday";

const PERIOD_LABELS: Record<Period, string> = {
  "24h": "last 24 hours",
  "48h": "last 48 hours",
  "7d":  "last 7 days",
};

// Each weekday defines the editorial angle for the agency LinkedIn post.
const WEEKDAY_ANGLES: Record<Weekday, { theme: string; focus: string; exclude: string }> = {
  monday: {
    theme:   "AI Search News",
    focus:   "verified AI search or answer-engine developments, brand recommendation changes, new AI platform capabilities, or algorithm updates that affect how AI tools recommend local or service businesses to buyers. Prioritise stories with a direct implication for agency clients.",
    exclude: "generic productivity tools, meeting assistants, CRM features, or funding announcements that have no specific AI-search-client-service implication.",
  },
  tuesday: {
    theme:   "Client vs. Competitors",
    focus:   "how brands and businesses appear differently in AI answers, how AI tools compare competitors, citation sources, brand visibility gaps, or case studies showing why one brand is recommended over another in AI. The goal is to surface practical ways agencies can benchmark and compare client visibility.",
    exclude: "unrelated SaaS tools, hardware, or infrastructure stories. Only include news with a direct connection to brand visibility, AI recommendations, or competitive intelligence in AI search.",
  },
  wednesday: {
    theme:   "Package AEO Services",
    focus:   "how agencies can scope, price, explain, or position Answer Engine Optimisation (AEO) as a client service. Look for developments in AI search that create a new or updated service opportunity: new platforms, new tracking approaches, new client deliverables, or changes in how AI surfaces business information.",
    exclude: "personal productivity AI, meeting tools, or AI content generation unless there is a specific AEO-service-packaging angle.",
  },
  thursday: {
    theme:   "Reporting Checklist",
    focus:   "practical AI visibility audit steps, measurement approaches, client-reporting methods, tracking tools, or frameworks agencies can use to show clients where they appear in AI answers. Include developments in analytics, citation tracking, or monitoring that make client reporting clearer.",
    exclude: "stories with no clear audit, measurement, or reporting angle for agency clients.",
  },
  friday: {
    theme:   "Agency Workflow",
    focus:   "practical workflows, tools, and process improvements for agencies managing AI search visibility for multiple clients. Include stories about dashboard approaches, client switching, batch-monitoring tools, workflow automation, or new ways agencies can operationalise AEO at scale.",
    exclude: "stories unrelated to agency operations or multi-client management workflows.",
  },
};

export interface NewsStory {
  rank:                number;
  headline:            string;
  category:            string;
  whatIsNew:           string;    // What changed — 2 sentences
  whatItHelpsDo:       string;    // Why agencies should care
  bestFor:             string;    // What it means for their clients
  businessOpportunity: string;    // Suggested post angle / practical action
  howToTryIt:          string;    // How to verify / practical first step
  sourceName:          string;
  sourceUrl:           string;
  publishedAt:         string | null;
}

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


export async function POST(request: NextRequest) {
  try { await requireAdmin(); }
  catch (error) { return authErrorResponse(error); }

  let body: { period?: unknown; weekday?: unknown };
  try { body = await request.json(); }
  catch { body = {}; }

  const period: Period = (["24h", "48h", "7d"].includes(body.period as string)
    ? body.period : "24h") as Period;

  const weekday: Weekday = (
    ["monday", "tuesday", "wednesday", "thursday", "friday"].includes(body.weekday as string)
      ? body.weekday : "monday"
  ) as Weekday;

  const periodLabel = PERIOD_LABELS[period];
  const angle       = WEEKDAY_ANGLES[weekday];
  const now         = new Date();
  const nowISO      = now.toISOString();

  const prompt = `You are the editorial AI for "Customers.Direct Agency LinkedIn Studio."

CURRENT TIMESTAMP: ${nowISO}
SEARCH WINDOW: ${periodLabel} (do NOT expand beyond this window; if no qualifying stories exist, return an empty array and say so in zero stories)

YOUR AUDIENCE:
Marketing agency owners, SEO directors, and client strategy teams who help their business clients get found in AI search. They want verified, specific, agency-relevant news they can use in LinkedIn content that positions them as AEO (Answer Engine Optimisation) experts.

TODAY'S EDITORIAL ANGLE — ${angle.theme.toUpperCase()}:
Focus specifically on: ${angle.focus}

EXCLUDE: ${angle.exclude}
Also exclude: generic AI productivity tools, meeting assistants, CRM features, funding rounds with no product benefit, academic papers, hardware, and stories with no specific AI-search or agency-client-service relevance.

QUALIFICATION TEST:
Before including any story, you must be able to complete: "A marketing agency owner can use this to help their clients ___________." If not — exclude it.

SEARCH INSTRUCTIONS:
1. Search for news published strictly in the ${periodLabel}.
2. Return up to 8 qualifying stories ranked by agency relevance.
3. Prefer primary sources: official company blogs, product announcements, platform release notes.
4. Every sourceUrl must be real and verifiable from your search results.
5. Do NOT invent URLs, dates, quotes, or facts.
6. If no stories qualify, return an empty stories array — do not pad with off-topic items.
7. publishedAt must be the actual article publication date (ISO 8601), not today's date or the crawl date.

FOR EACH STORY, PROVIDE:
- headline: Agency-relevant headline written for a marketing agency owner (not a press release)
- category: One of — AI Search | AEO | Brand Visibility | Competitor Intelligence | Client Reporting | Agency Tools | Platform Update | AI Content
- whatIsNew: Exactly 2 sentences. What was released, announced, or changed?
- whatItHelpsDo: Why agencies should care about this for their clients — specific, not generic
- bestFor: What this means for the clients agencies serve (specific client types or scenarios)
- businessOpportunity: A suggested LinkedIn post angle or practical action an agency can take this week
- howToTryIt: The quickest practical first step an agency can take, or how to find the primary source
- sourceName, sourceUrl (real URL), publishedAt (ISO 8601 or null), rank

Return a JSON object with a "stories" array.`;

  const answer = await askNewsModel({
    label: "news/search",
    prompt,
    schemaName: "news_stories",
    schema: STORIES_SCHEMA,
    timeoutMs: 55_000,
    timeoutMessage: "Search timed out. Please try again.",
  });
  if (!answer.ok) return NextResponse.json({ error: answer.error }, { status: answer.status });
  const parsed = answer.data as { stories?: unknown[] };
  if (!Array.isArray(parsed.stories)) {
    console.error("[news/search] 'stories' is missing or not an array");
    return NextResponse.json({ error: "AI returned an unexpected format. Please try again." }, { status: 502 });
  }

  const stories: NewsStory[] = (parsed.stories as Partial<NewsStory>[])
    .slice(0, 8)
    .map((s, i) => ({
      rank:                typeof s.rank === "number" ? s.rank : i + 1,
      headline:            s.headline            ?? "",
      category:            s.category            ?? "AI Search",
      whatIsNew:           s.whatIsNew           ?? "",
      whatItHelpsDo:       s.whatItHelpsDo       ?? "",
      bestFor:             s.bestFor             ?? "",
      businessOpportunity: s.businessOpportunity ?? "",
      howToTryIt:          s.howToTryIt          ?? "",
      sourceName:          s.sourceName          ?? "",
      sourceUrl:           s.sourceUrl           ?? "",
      publishedAt:         s.publishedAt         ?? null,
    }));

  return NextResponse.json({ stories, period, weekday });
}
