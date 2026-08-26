import "server-only";
import type {
  BacklinkOverview,
  CompetitorKeywordGap,
  DomainOverview,
  KeywordIdea,
  RankedKeyword,
  SearchIntent,
  SeoResult,
  SerpSnapshot,
} from "@/types/seo";
import type { SeoProviderAdapter } from "./provider";

// DataForSEO API v3 — HTTP Basic Auth over a login/password pair issued from
// the DataForSEO dashboard's "API Access" tab (NOT a single bearer API key —
// verified against DataForSEO's own current auth documentation before
// implementing this). Credentials never reach the browser: this file is
// "server-only" and every function that calls it lives under src/app/api or
// other server-only lib code.
const BASE_URL = process.env.DATAFORSEO_BASE_URL?.trim() || "https://api.dataforseo.com";

function isConfigured(): boolean {
  return Boolean(process.env.DATAFORSEO_LOGIN && process.env.DATAFORSEO_PASSWORD);
}

function authHeader(): string {
  const login = process.env.DATAFORSEO_LOGIN ?? "";
  const password = process.env.DATAFORSEO_PASSWORD ?? "";
  return `Basic ${Buffer.from(`${login}:${password}`).toString("base64")}`;
}

/**
 * Low-level POST to a DataForSEO v3 "live" endpoint. DataForSEO's task-based
 * REST API takes an array of task objects and returns `tasks[]`, each with
 * its own `status_code`/`status_message` and `result[]`. This wraps that in
 * our SeoResult<T[]> shape, treating anything other than DataForSEO's own
 * "Ok" status code (20000) as an explicit failure — never partial-parses a
 * malformed or errored response into fabricated data.
 */
async function dataForSeoPost<T = unknown>(
  endpoint: string,
  tasks: Record<string, unknown>[],
): Promise<SeoResult<T[]>> {
  if (!isConfigured()) {
    return { ok: false, error: "DataForSEO is not configured (missing DATAFORSEO_LOGIN/DATAFORSEO_PASSWORD)." };
  }

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: "POST",
      headers: {
        Authorization: authHeader(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(tasks),
      signal: AbortSignal.timeout(20_000),
    });

    if (!response.ok) {
      const text = await response.text();
      return { ok: false, error: `DataForSEO HTTP ${response.status}: ${text.slice(0, 300)}` };
    }

    const payload = await response.json();
    const task = payload?.tasks?.[0];
    if (!task) {
      return { ok: false, error: "DataForSEO returned no task result." };
    }
    if (task.status_code !== 20000) {
      return { ok: false, error: `DataForSEO task error: ${task.status_message ?? task.status_code}` };
    }

    const result = (task.result ?? []) as T[];
    return { ok: true, data: result };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? `DataForSEO request failed: ${error.message}` : "DataForSEO request failed.",
    };
  }
}

function toIntent(value: unknown): SearchIntent {
  const s = typeof value === "string" ? value.toLowerCase() : "";
  if (s.includes("informational")) return "informational";
  if (s.includes("navigational")) return "navigational";
  if (s.includes("commercial")) return "commercial";
  if (s.includes("transactional")) return "transactional";
  return null;
}

export const dataForSeoAdapter: SeoProviderAdapter = {
  id: "dataforseo",
  label: "DataForSEO",
  isConfigured,

  async getDomainOverview(domain, locationName) {
    const result = await dataForSeoPost<Record<string, unknown>>(
      "/v3/dataforseo_labs/google/domain_rank_overview/live",
      [{ target: domain, location_name: locationName ?? "United States", language_code: "en" }],
    );
    if (!result.ok) return result;

    const items = (result.data[0]?.items as Array<Record<string, unknown>> | undefined) ?? [];
    // DataForSEO Labs returns one row per metrics group (e.g. organic vs paid) —
    // prefer the "organic" one, since that's what Customers.Direct surfaces.
    const organic =
      items.find((i) => i.se_type === "organic" || (i.metrics as Record<string, unknown>)?.organic) ?? items[0];
    const metrics = (organic?.metrics as Record<string, unknown>)?.organic as Record<string, unknown> | undefined;

    const overview: DomainOverview = {
      domain,
      organicKeywords: (metrics?.count as number) ?? null,
      estimatedTraffic: (metrics?.etv as number) ? Math.round(metrics!.etv as number) : null,
      estimatedTrafficValue: (metrics?.estimated_paid_traffic_cost as number) ?? null,
      referringDomains: null, // filled in separately via getBacklinkOverview — this endpoint is organic-only
      backlinks: null,
      domainRank: (organic?.rank as number) ?? null,
      raw: result.data,
    };
    return { ok: true, data: overview };
  },

  async discoverKeywords(domain, locationName) {
    const result = await dataForSeoPost<Record<string, unknown>>(
      "/v3/dataforseo_labs/google/keywords_for_site/live",
      [
        {
          target: domain,
          location_name: locationName ?? "United States",
          language_code: "en",
          limit: 50,
        },
      ],
    );
    if (!result.ok) return result;

    const items = (result.data[0]?.items as Array<Record<string, unknown>> | undefined) ?? [];
    const ideas: KeywordIdea[] = items.map((item) => {
      const info = item.keyword_info as Record<string, unknown> | undefined;
      return {
        keyword: (item.keyword as string) ?? "",
        searchVolume: (info?.search_volume as number) ?? null,
        difficulty: (item.keyword_properties as Record<string, unknown>)?.keyword_difficulty as number ?? null,
        cpc: (info?.cpc as number) ?? null,
        intent: toIntent((item.search_intent_info as Record<string, unknown>)?.main_intent),
      };
    });
    return { ok: true, data: ideas };
  },

  async getKeywordMetrics(keywords, locationName) {
    if (keywords.length === 0) return { ok: true, data: [] };
    const result = await dataForSeoPost<Record<string, unknown>>(
      "/v3/keywords_data/google_ads/search_volume/live",
      [
        {
          keywords: keywords.slice(0, 1000),
          location_name: locationName ?? "United States",
          language_code: "en",
        },
      ],
    );
    if (!result.ok) return result;

    const ideas: KeywordIdea[] = result.data.map((item) => ({
      keyword: (item.keyword as string) ?? "",
      searchVolume: (item.search_volume as number) ?? null,
      difficulty: (item.competition_index as number) ?? null,
      cpc: (item.cpc as number) ?? null,
      intent: null,
    }));
    return { ok: true, data: ideas };
  },

  async getDomainRankings(domain, locationName) {
    const result = await dataForSeoPost<Record<string, unknown>>(
      "/v3/dataforseo_labs/google/ranked_keywords/live",
      [
        {
          target: domain,
          location_name: locationName ?? "United States",
          language_code: "en",
          limit: 100,
          load_rank_absolute: true,
        },
      ],
    );
    if (!result.ok) return result;

    const items = (result.data[0]?.items as Array<Record<string, unknown>> | undefined) ?? [];
    const rankings: RankedKeyword[] = items.map((item) => {
      const serp = item.ranked_serp_element as Record<string, unknown> | undefined;
      const serpItem = (serp?.serp_item as Record<string, unknown>) ?? {};
      const info = item.keyword_data as Record<string, unknown> | undefined;
      const kwInfo = (info?.keyword_info as Record<string, unknown>) ?? {};
      return {
        keyword: (info?.keyword as string) ?? "",
        position: (serpItem.rank_absolute as number) ?? null,
        searchVolume: (kwInfo.search_volume as number) ?? null,
        difficulty: ((info?.keyword_properties as Record<string, unknown>)?.keyword_difficulty as number) ?? null,
        url: (serpItem.url as string) ?? null,
      };
    });
    return { ok: true, data: rankings };
  },

  async compareCompetitorKeywords(domain, competitorDomain, locationName) {
    const result = await dataForSeoPost<Record<string, unknown>>(
      "/v3/dataforseo_labs/google/domain_intersection/live",
      [
        {
          target1: competitorDomain,
          target2: domain,
          location_name: locationName ?? "United States",
          language_code: "en",
          // "in target1, not (well) in target2" — i.e. competitor ranks, we don't/worse.
          intersections: false,
          limit: 100,
        },
      ],
    );
    if (!result.ok) return result;

    const items = (result.data[0]?.items as Array<Record<string, unknown>> | undefined) ?? [];
    const gaps: CompetitorKeywordGap[] = items.map((item) => {
      const first = item.first_domain_serp_element as Record<string, unknown> | undefined;
      const second = item.second_domain_serp_element as Record<string, unknown> | undefined;
      const kwInfo = (item.keyword_data as Record<string, unknown>)?.keyword_info as Record<string, unknown> | undefined;
      const kwProps = (item.keyword_data as Record<string, unknown>)?.keyword_properties as Record<string, unknown> | undefined;
      return {
        keyword: ((item.keyword_data as Record<string, unknown>)?.keyword as string) ?? "",
        searchVolume: (kwInfo?.search_volume as number) ?? null,
        difficulty: (kwProps?.keyword_difficulty as number) ?? null,
        competitorPosition: (first?.rank_absolute as number) ?? null,
        businessPosition: (second?.rank_absolute as number) ?? null,
        competitorUrl: (first?.url as string) ?? null,
      };
    });
    return { ok: true, data: gaps };
  },

  async getBacklinkOverview(domain) {
    const summary = await dataForSeoPost<Record<string, unknown>>("/v3/backlinks/summary/live", [
      { target: domain, internal_list_limit: 10 },
    ]);
    if (!summary.ok) return summary;

    const referring = await dataForSeoPost<Record<string, unknown>>("/v3/backlinks/referring_domains/live", [
      { target: domain, limit: 20, order_by: ["backlinks,desc"] },
    ]);

    const summaryRow = summary.data[0];
    const topDomains = referring.ok
      ? ((referring.data[0]?.items as Array<Record<string, unknown>> | undefined) ?? []).map((item) => ({
          domain: (item.domain as string) ?? "",
          backlinks: (item.backlinks as number) ?? null,
          firstSeen: (item.first_seen as string) ?? null,
          domainRank: (item.rank as number) ?? null,
        }))
      : [];

    const overview: BacklinkOverview = {
      domain,
      referringDomains: (summaryRow?.referring_domains as number) ?? null,
      backlinks: (summaryRow?.backlinks as number) ?? null,
      topReferringDomains: topDomains,
    };
    return { ok: true, data: overview };
  },

  async getSerp(keyword, locationName) {
    const result = await dataForSeoPost<Record<string, unknown>>("/v3/serp/google/organic/live/advanced", [
      { keyword, location_name: locationName ?? "United States", language_code: "en", depth: 20 },
    ]);
    if (!result.ok) return result;

    const items = (result.data[0]?.items as Array<Record<string, unknown>> | undefined) ?? [];
    const snapshot: SerpSnapshot = {
      keyword,
      location: locationName,
      items: items
        .filter((item) => item.type === "organic")
        .map((item) => ({
          position: (item.rank_absolute as number) ?? 0,
          title: (item.title as string) ?? "",
          url: (item.url as string) ?? "",
          domain: (item.domain as string) ?? "",
        })),
    };
    return { ok: true, data: snapshot };
  },
};
