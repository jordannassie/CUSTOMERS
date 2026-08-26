import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { BusinessCompetitor, VisibilityScore } from "@/types/geo";

// ─── Provider metadata ────────────────────────────────────────────────────────

export const PROVIDER_LABELS: Record<string, string> = {
  openai: "ChatGPT",
  anthropic: "Claude",
  perplexity: "Perplexity",
  google_ai_overviews: "Google AI",
};

export const PROVIDER_COLORS: Record<string, string> = {
  openai: "#10B981",
  anthropic: "#7C3AED",
  perplexity: "#2563EB",
  google_ai_overviews: "#FBBC04",
};

// ─── Domain classifier ────────────────────────────────────────────────────────

const UGC_DOMAINS = [
  "reddit.com", "quora.com", "yelp.com", "tripadvisor.com", "trustpilot.com",
  "g2.com", "capterra.com", "producthunt.com", "twitter.com", "x.com",
  "facebook.com", "instagram.com", "tiktok.com",
];
const REFERENCE_DOMAINS = [
  "wikipedia.org", "wikihow.com", "britannica.com", "crunchbase.com",
  "bloomberg.com", ".gov",
];
const EDITORIAL_DOMAINS = [
  "techcrunch.com", "forbes.com", "inc.com", "wired.com", "verge.com",
  "zdnet.com", "cnet.com", "pcmag.com", "techradar.com", "gartner.com",
  "mckinsey.com", "hbr.org", "businessinsider.com",
];
const DIRECTORY_DOMAINS = [
  "yellowpages.com", "angi.com", "homeadvisor.com", "thumbtack.com",
  "bbb.org", "chamberofcommerce.com", "manta.com",
];

/**
 * Classify a domain into a source category.
 * Returns deterministic results based on known domain lists.
 * Unknown domains fall into "Citation" rather than a guessed category.
 */
export function classifyDomain(domain: string, ownDomain: string | null): string {
  if (ownDomain && domain.includes(ownDomain)) return "You";
  if (UGC_DOMAINS.some((d) => domain.includes(d))) return "Forum / UGC";
  if (REFERENCE_DOMAINS.some((d) => domain.includes(d))) return "Reference";
  if (EDITORIAL_DOMAINS.some((d) => domain.includes(d))) return "Editorial";
  if (DIRECTORY_DOMAINS.some((d) => domain.includes(d))) return "Directory";
  return "Citation";
}

// ─── Result row shape (mirrors dashboard-data.ts) ────────────────────────────

interface ResultRow {
  id: string;
  provider: string;
  business_mentioned: boolean;
  mention_position: number | null;
  competitors_mentioned: Array<{ name: string }>;
  cited_sources: Array<{ url: string }>;
  methodology: string | null;
  created_at: string;
  tracked_prompt_id: string | null;
  prompt: string | null;
}

function mapResultRows(data: Array<Record<string, unknown>>): ResultRow[] {
  return data.map((row) => ({
    id: row.id as string,
    provider: row.provider as string,
    business_mentioned: row.business_mentioned as boolean,
    mention_position: row.mention_position as number | null,
    competitors_mentioned: (row.competitors_mentioned as Array<{ name: string }>) ?? [],
    cited_sources: (row.cited_sources as Array<{ url: string }>) ?? [],
    methodology: (row.methodology as string | null) ?? null,
    created_at: row.created_at as string,
    tracked_prompt_id: row.tracked_prompt_id as string | null,
    prompt: (row.tracked_prompts as { prompt: string } | null)?.prompt ?? null,
  }));
}

// ─── Exported types ───────────────────────────────────────────────────────────

export interface OverviewMetrics {
  directScore: number | null;
  directScoreDelta: number | null;
  /** Percentage 0-100 */
  mentionRate: number | null;
  mentionRateDelta: number | null;
  /** Percentage 0-100 */
  shareOfVoice: number | null;
  shareOfVoiceDelta: number | null;
  /** Average position among mentioned results (null if not mentioned) */
  avgPosition: number | null;
  promptsWon: number | null;
  promptsTested: number | null;
  /** Percentage 0-100 */
  citationRate: number | null;
  totalCitations: number;
  uniqueSources: number;
  ownPageCitations: number;
  /** Rank of this business among itself + all tracked competitors by mention rate */
  marketRank: number | null;
  /** Total participants in market rank (business + competitors with data) */
  marketTotal: number | null;
}

/**
 * One data point in the competitor trend chart.
 * Keyed by entity name (business name or competitor name → mention rate 0-100).
 */
export interface TrendPoint {
  date: string;
  /** ISO date string for sorting */
  isoDate: string;
  /** Business mention rate 0-100 */
  business: number | null;
  /** Competitor mention rates: name → rate 0-100 */
  competitors: Record<string, number>;
}

export interface ModelMetric {
  provider: string;
  label: string;
  color: string;
  mentions: number;
  total: number;
  /** 0–1 */
  mentionRate: number;
  avgPosition: number | null;
}

export interface CompetitorMetric {
  id: string;
  name: string;
  domain: string | null;
  /** Count of results where this competitor was mentioned (latest scan) */
  mentionCount: number;
  /** Fraction of prompts (latest scan) where they appeared */
  mentionRate: number;
}

export interface CitationAggregate {
  domain: string;
  fullUrls: string[];
  count: number;
  type: string;
  /** 0–1 */
  share: number;
  models: string[];
  promptCount: number;
  isOwn: boolean;
}

export interface OwnPage {
  path: string;
  fullUrl: string;
  count: number;
}

export interface DashboardAggregates {
  overview: OverviewMetrics;
  /** Oldest-first history of visibility scores */
  history: VisibilityScore[];
  /**
   * Oldest-first trend series combining business + competitor mention rates.
   * Used by CompetitorTrendChart to show multi-series comparison.
   */
  trendSeries: TrendPoint[];
  models: ModelMetric[];
  competitors: CompetitorMetric[];
  citations: CitationAggregate[];
  ownPages: OwnPage[];
  /** Latest scan's results (for prompt table + other sections) */
  results: ResultRow[];
  hasAnyRun: boolean;
  latestRunStatus: string | null;
  latestRunError: string | null;
  businessDomain: string | null;
}

// ─── Main aggregator ──────────────────────────────────────────────────────────

/**
 * Single server call that produces all data needed by the dashboard.
 *
 * Share of Voice formula:
 *   SOV = business weighted mentions / (business + all competitor mentions)
 *   across the full prompt set for the latest scan.
 *   "Weighted mention" = 1 per result where the entity appears (not per prompt).
 *
 * Average Position formula:
 *   Mean of mention_position across results where business_mentioned = true
 *   and mention_position is not null. Not computed when business is never mentioned.
 */
export async function getDashboardAggregates(
  businessId: string,
): Promise<DashboardAggregates> {
  const supabase = await createClient();

  const [scoresResult, runsResult, competitorsResult, businessResult] =
    await Promise.all([
      supabase
        .from("visibility_scores")
        .select("*")
        .eq("business_id", businessId)
        .order("calculated_at", { ascending: false })
        .limit(12),
      supabase
        .from("visibility_runs")
        .select("id, provider, status, started_at, completed_at, error")
        .eq("business_id", businessId)
        .order("started_at", { ascending: false })
        .limit(8),
      supabase
        .from("business_competitors")
        .select("*")
        .eq("business_id", businessId)
        .order("created_at", { ascending: true }),
      supabase
        .from("businesses")
        .select("domain")
        .eq("id", businessId)
        .single(),
    ]);

  const scores = ((scoresResult.data ?? []) as VisibilityScore[]);
  const runs = runsResult.data ?? [];
  const competitors = ((competitorsResult.data ?? []) as BusinessCompetitor[]);
  const ownDomain = businessResult.data?.domain ?? null;

  const latestScore = scores[0] ?? null;
  const prevScore = scores[1] ?? null;
  const history = [...scores].reverse(); // oldest-first

  // Latest completed run
  const latestCompletedRun = runs.find((r) => r.status === "completed") ?? null;
  const latestRun = runs[0] ?? null;

  // Fetch results for latest completed run
  let results: ResultRow[] = [];
  if (latestCompletedRun) {
    const { data } = await supabase
      .from("visibility_results")
      .select(
        "id, provider, business_mentioned, mention_position, competitors_mentioned, cited_sources, methodology, created_at, tracked_prompt_id, tracked_prompts(prompt)",
      )
      .eq("run_id", latestCompletedRun.id)
      .order("created_at", { ascending: true });
    results = mapResultRows((data ?? []) as Array<Record<string, unknown>>);
  }

  // ── Overview KPIs ────────────────────────────────────────────────────────

  const mentionRate =
    latestScore?.mention_rate != null
      ? Math.round((latestScore.mention_rate) * 100)
      : null;
  const prevMentionRate =
    prevScore?.mention_rate != null
      ? Math.round((prevScore.mention_rate) * 100)
      : null;
  const mentionRateDelta =
    mentionRate != null && prevMentionRate != null
      ? mentionRate - prevMentionRate
      : null;

  // Share of Voice: reuse competitor_share from visibility_scores
  // (competitor_share = promptsWon / (promptsWon + totalCompetitorMentions))
  const shareOfVoice =
    latestScore?.competitor_share != null
      ? Math.round((latestScore.competitor_share) * 100)
      : null;
  const prevShareOfVoice =
    prevScore?.competitor_share != null
      ? Math.round((prevScore.competitor_share) * 100)
      : null;
  const shareOfVoiceDelta =
    shareOfVoice != null && prevShareOfVoice != null
      ? shareOfVoice - prevShareOfVoice
      : null;

  // Average position (current scan results only)
  const mentionedWithPos = results.filter(
    (r) => r.business_mentioned && r.mention_position != null,
  );
  const avgPosition =
    mentionedWithPos.length > 0
      ? Math.round(
          (mentionedWithPos.reduce(
            (sum, r) => sum + (r.mention_position ?? 0),
            0,
          ) /
            mentionedWithPos.length) *
            10,
        ) / 10
      : null;

  const citationRate =
    latestScore?.citation_rate != null
      ? Math.round(latestScore.citation_rate * 100)
      : null;

  // ── Models ───────────────────────────────────────────────────────────────

  const modelMap = new Map<
    string,
    { won: number; total: number; positions: number[] }
  >();
  for (const r of results) {
    const m = modelMap.get(r.provider) ?? { won: 0, total: 0, positions: [] };
    m.total++;
    if (r.business_mentioned) {
      m.won++;
      if (r.mention_position != null) m.positions.push(r.mention_position);
    }
    modelMap.set(r.provider, m);
  }

  const models: ModelMetric[] = Array.from(modelMap.entries()).map(
    ([provider, data]) => ({
      provider,
      label: PROVIDER_LABELS[provider] ?? provider,
      color: PROVIDER_COLORS[provider] ?? "#94A3B8",
      mentions: data.won,
      total: data.total,
      mentionRate: data.total > 0 ? data.won / data.total : 0,
      avgPosition:
        data.positions.length > 0
          ? Math.round(
              (data.positions.reduce((a, b) => a + b, 0) /
                data.positions.length) *
                10,
            ) / 10
          : null,
    }),
  );

  // ── Competitors ──────────────────────────────────────────────────────────

  // Count how many results each competitor appeared in (latest scan)
  const competitorMentionMap = new Map<string, number>();
  for (const r of results) {
    for (const c of r.competitors_mentioned) {
      const key = c.name.toLowerCase().trim();
      competitorMentionMap.set(key, (competitorMentionMap.get(key) ?? 0) + 1);
    }
  }

  const competitorMetrics: CompetitorMetric[] = competitors.map((c) => {
    const key = c.name.toLowerCase().trim();
    const mentionCount = competitorMentionMap.get(key) ?? 0;
    return {
      id: c.id,
      name: c.name,
      domain: c.domain,
      mentionCount,
      mentionRate: results.length > 0 ? mentionCount / results.length : 0,
    };
  });
  competitorMetrics.sort((a, b) => b.mentionCount - a.mentionCount);

  // ── Market Rank ───────────────────────────────────────────────────────────
  // Rank business among itself + all tracked competitors by current mention rate.

  const currentMentionRate = (mentionRate ?? 0) / 100;
  const allParticipants = [
    { name: "__business__", rate: currentMentionRate, isYou: true },
    ...competitorMetrics.map((c) => ({ name: c.name, rate: c.mentionRate, isYou: false })),
  ].filter((p) => p.isYou || p.rate > 0 || results.length > 0);

  allParticipants.sort((a, b) => b.rate - a.rate);
  const marketRankIdx = allParticipants.findIndex((p) => p.isYou);
  const marketRank = results.length > 0 ? marketRankIdx + 1 : null;
  const marketTotal = results.length > 0 ? allParticipants.length : null;

  // ── Trend Series (competitor chart) ───────────────────────────────────────
  // For each historical completed run, compute competitor mention rates.
  // We fetch all results for the last 8 runs in one query and aggregate in memory.

  const trendSeries: TrendPoint[] = [];

  const completedRuns = runs
    .filter((r) => r.status === "completed")
    .slice(0, 8);

  if (completedRuns.length >= 1) {
    const runIds = completedRuns.map((r) => r.id);

    const { data: historicalResults } = await supabase
      .from("visibility_results")
      .select("run_id, business_mentioned, mention_position, competitors_mentioned, created_at")
      .in("run_id", runIds);

    // Group by run_id
    const byRun = new Map<string, typeof historicalResults>();
    for (const row of historicalResults ?? []) {
      const arr = byRun.get(row.run_id) ?? [];
      arr.push(row);
      byRun.set(row.run_id, arr);
    }

    // Build trend points for each run (oldest first)
    const sortedRuns = [...completedRuns].reverse();
    for (const run of sortedRuns) {
      const runResults = byRun.get(run.id) ?? [];
      if (runResults.length === 0) continue;

      const total = runResults.length;
      const businessMentions = runResults.filter((r) => r.business_mentioned).length;
      const businessRate = Math.round((businessMentions / total) * 100);

      // Count competitor mentions
      const competitorRates: Record<string, number> = {};
      for (const comp of competitors) {
        const key = comp.name.toLowerCase().trim();
        const count = runResults.filter((r) =>
          ((r.competitors_mentioned as Array<{ name: string }>) ?? []).some(
            (c) => c.name.toLowerCase().trim() === key,
          ),
        ).length;
        if (count > 0 || competitors.length <= 5) {
          competitorRates[comp.name] = Math.round((count / total) * 100);
        }
      }

      trendSeries.push({
        date: new Date(run.started_at).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        isoDate: run.started_at,
        business: businessRate,
        competitors: competitorRates,
      });
    }
  }

  // ── Citations ────────────────────────────────────────────────────────────

  const domainMap = new Map<
    string,
    {
      count: number;
      fullUrls: Set<string>;
      models: Set<string>;
      promptIds: Set<string | null>;
    }
  >();

  for (const r of results) {
    for (const s of r.cited_sources) {
      let domain = s.url;
      try {
        domain = new URL(s.url).hostname.replace(/^www\./, "");
      } catch {
        /* keep raw */
      }
      const entry = domainMap.get(domain) ?? {
        count: 0,
        fullUrls: new Set<string>(),
        models: new Set<string>(),
        promptIds: new Set<string | null>(),
      };
      entry.count++;
      entry.fullUrls.add(s.url);
      entry.models.add(r.provider);
      entry.promptIds.add(r.tracked_prompt_id);
      domainMap.set(domain, entry);
    }
  }

  const totalCitations = Array.from(domainMap.values()).reduce(
    (sum, v) => sum + v.count,
    0,
  );
  const uniqueSources = domainMap.size;

  const citations: CitationAggregate[] = Array.from(domainMap.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .map(([domain, entry]) => ({
      domain,
      fullUrls: Array.from(entry.fullUrls),
      count: entry.count,
      type: classifyDomain(domain, ownDomain),
      share: totalCitations > 0 ? entry.count / totalCitations : 0,
      models: Array.from(entry.models),
      promptCount: entry.promptIds.size,
      isOwn: Boolean(ownDomain && domain.includes(ownDomain)),
    }));

  // ── Own pages ────────────────────────────────────────────────────────────

  const ownPageMap = new Map<string, { path: string; count: number }>();
  if (ownDomain) {
    for (const r of results) {
      for (const s of r.cited_sources) {
        if (!s.url.includes(ownDomain)) continue;
        let path = s.url;
        try {
          path = new URL(s.url).pathname || "/";
        } catch {
          /* keep raw */
        }
        const existing = ownPageMap.get(s.url) ?? { path, count: 0 };
        existing.count++;
        ownPageMap.set(s.url, existing);
      }
    }
  }

  const ownPages: OwnPage[] = Array.from(ownPageMap.entries())
    .map(([fullUrl, { path, count }]) => ({ fullUrl, path, count }))
    .sort((a, b) => b.count - a.count);

  const ownPageCitations = ownPages.reduce((sum, p) => sum + p.count, 0);

  // ── Return ───────────────────────────────────────────────────────────────

  return {
    overview: {
      directScore: latestScore?.score ?? null,
      directScoreDelta:
        latestScore && prevScore ? latestScore.score - prevScore.score : null,
      mentionRate,
      mentionRateDelta,
      shareOfVoice,
      shareOfVoiceDelta,
      avgPosition,
      promptsWon: latestScore?.prompts_won ?? null,
      promptsTested: latestScore?.prompts_tested ?? null,
      citationRate,
      totalCitations,
      uniqueSources,
      ownPageCitations,
      marketRank,
      marketTotal,
    },
    history,
    trendSeries,
    models,
    competitors: competitorMetrics,
    citations,
    ownPages,
    results,
    hasAnyRun: latestRun !== null,
    latestRunStatus: latestRun?.status ?? null,
    latestRunError: latestRun?.error ?? null,
    businessDomain: ownDomain,
  };
}
