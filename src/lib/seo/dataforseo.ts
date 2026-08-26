/**
 * DataForSEO API client — server-side only.
 *
 * Credentials: DATAFORSEO_USERNAME + DATAFORSEO_PASSWORD (Basic Auth)
 * Documentation: https://docs.dataforseo.com/v3/
 *
 * This module provides a normalized abstraction over DataForSEO responses.
 * Callers receive typed SeoSnapshot objects — not raw API payloads.
 *
 * Cost management:
 * - Results are cached in seo_snapshots for 7 days.
 * - The SEO API route checks the cache before calling DataForSEO.
 * - Never call this from client components.
 */
import "server-only";
import type {
  SeoSnapshot,
  SeoKeyword,
  SeoCompetitorDomain,
  BacklinkSummary,
  DomainOverview,
  KeywordGap,
} from "./types";

const BASE_URL = "https://api.dataforseo.com/v3";
const USERNAME = process.env.DATAFORSEO_USERNAME;
const PASSWORD = process.env.DATAFORSEO_PASSWORD;

export const dataForSeoEnabled = !!(USERNAME && PASSWORD);

function basicAuth(): string {
  return "Basic " + Buffer.from(`${USERNAME}:${PASSWORD}`).toString("base64");
}

async function post<T = unknown>(endpoint: string, payload: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: "POST",
    headers: {
      Authorization: basicAuth(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    // Don't cache at the fetch level — caching is handled at the DB layer
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`DataForSEO ${endpoint} HTTP ${res.status}`);
  }

  const data = (await res.json()) as T;
  return data;
}

// ─── Domain overview (ranked keywords + traffic) ─────────────────────────────

interface DFSEODomainRankResponse {
  tasks?: Array<{
    result?: Array<{
      items?: Array<{
        metrics?: {
          organic?: {
            count?: number;
            etv?: number;
            pos_1?: number;
            pos_2_3?: number;
          };
        };
        domain_rank?: number;
      }>;
    }>;
  }>;
}

async function fetchDomainOverview(domain: string): Promise<DomainOverview> {
  const data = await post<DFSEODomainRankResponse>(
    "/dataforseo_labs/google/domain_rank_overview/live",
    [{ target: domain, language_name: "English", location_name: "United States" }],
  );

  const item = data?.tasks?.[0]?.result?.[0]?.items?.[0];
  if (!item) return { keywords: 0, organicTraffic: 0 };

  return {
    keywords: item.metrics?.organic?.count ?? 0,
    organicTraffic: Math.round(item.metrics?.organic?.etv ?? 0),
    rank: item.domain_rank,
  };
}

// ─── Ranked keywords ─────────────────────────────────────────────────────────

interface DFSEORankedKeywordsResponse {
  tasks?: Array<{
    result?: Array<{
      items?: Array<{
        keyword_data?: {
          keyword?: string;
          keyword_info?: {
            search_volume?: number;
            cpc?: number;
            keyword_difficulty?: number;
          };
        };
        ranked_serp_element?: {
          serp_item?: {
            rank_absolute?: number;
            url?: number;
          };
        };
      }>;
    }>;
  }>;
}

async function fetchRankedKeywords(domain: string): Promise<SeoKeyword[]> {
  const data = await post<DFSEORankedKeywordsResponse>(
    "/dataforseo_labs/google/ranked_keywords/live",
    [
      {
        target: domain,
        language_name: "English",
        location_name: "United States",
        limit: 50,
        order_by: ["keyword_data.keyword_info.search_volume,desc"],
        filters: [
          ["ranked_serp_element.serp_item.rank_absolute", "<=", 50],
          "and",
          ["keyword_data.keyword_info.search_volume", ">", 10],
        ],
      },
    ],
  );

  const items = data?.tasks?.[0]?.result?.[0]?.items ?? [];
  return items.map((item) => ({
    keyword: item.keyword_data?.keyword ?? "",
    position: item.ranked_serp_element?.serp_item?.rank_absolute ?? 0,
    searchVolume: item.keyword_data?.keyword_info?.search_volume ?? 0,
    difficulty: item.keyword_data?.keyword_info?.keyword_difficulty,
    cpc: item.keyword_data?.keyword_info?.cpc,
  }));
}

// ─── Competitor domains ───────────────────────────────────────────────────────

interface DFSEOCompetitorResponse {
  tasks?: Array<{
    result?: Array<{
      items?: Array<{
        domain?: string;
        metrics?: {
          organic?: { count?: number; etv?: number };
        };
      }>;
    }>;
  }>;
}

async function fetchCompetitors(domain: string): Promise<SeoCompetitorDomain[]> {
  const data = await post<DFSEOCompetitorResponse>(
    "/dataforseo_labs/google/competitors_domain/live",
    [
      {
        target: domain,
        language_name: "English",
        location_name: "United States",
        limit: 5,
        exclude_top_domains: true,
      },
    ],
  );

  const items = data?.tasks?.[0]?.result?.[0]?.items ?? [];
  return items.map((item) => ({
    domain: item.domain ?? "",
    keywords: item.metrics?.organic?.count ?? 0,
    organicTraffic: Math.round(item.metrics?.organic?.etv ?? 0),
  }));
}

// ─── Backlinks ────────────────────────────────────────────────────────────────

interface DFSEOBacklinksResponse {
  tasks?: Array<{
    result?: Array<{
      referring_domains?: number;
      backlinks?: number;
      referring_pages?: number;
      rank?: number;
    }>;
  }>;
}

async function fetchBacklinks(domain: string): Promise<BacklinkSummary> {
  const data = await post<DFSEOBacklinksResponse>(
    "/backlinks/summary/live",
    [{ target: domain, limit: 1 }],
  );

  const result = data?.tasks?.[0]?.result?.[0];
  return {
    referringDomains: result?.referring_domains ?? 0,
    backlinks: result?.backlinks ?? 0,
    referringPages: result?.referring_pages,
    rank: result?.rank,
  };
}

// ─── Keyword gaps ─────────────────────────────────────────────────────────────

interface DFSEOKeywordGapResponse {
  tasks?: Array<{
    result?: Array<{
      items?: Array<{
        keyword?: string;
        intersection_values?: Array<{
          se_domain?: string;
          rank_absolute?: number;
        }>;
        keyword_data?: {
          keyword_info?: { search_volume?: number; keyword_difficulty?: number };
        };
      }>;
    }>;
  }>;
}

async function fetchKeywordGaps(
  domain: string,
  competitorDomains: string[],
): Promise<KeywordGap[]> {
  if (competitorDomains.length === 0) return [];

  const targets = [domain, ...competitorDomains.slice(0, 4)];
  const data = await post<DFSEOKeywordGapResponse>(
    "/dataforseo_labs/google/keywords_for_site/live",
    [
      {
        targets,
        language_name: "English",
        location_name: "United States",
        limit: 20,
        ignore_synonyms: true,
        order_by: ["keyword_data.keyword_info.search_volume,desc"],
        filters: [
          // Target domain NOT ranking but competitor IS
          [`intersection_values.${domain}.rank_absolute`, "not_exists", null],
          "and",
          [`intersection_values.${competitorDomains[0]}.rank_absolute`, "<=", 20],
        ],
      },
    ],
  ).catch(() => null);

  if (!data) return [];

  const items = data?.tasks?.[0]?.result?.[0]?.items ?? [];
  const gaps: KeywordGap[] = [];

  for (const item of items) {
    const keyword = item.keyword ?? "";
    // Find which competitor dominates
    const competitorValue = item.intersection_values?.find(
      (v) => v.se_domain !== domain && (v.rank_absolute ?? 999) <= 20,
    );
    if (!competitorValue) continue;

    gaps.push({
      keyword,
      competitorDomain: competitorValue.se_domain ?? "",
      competitorPosition: competitorValue.rank_absolute ?? 0,
      searchVolume: item.keyword_data?.keyword_info?.search_volume ?? 0,
      difficulty: item.keyword_data?.keyword_info?.keyword_difficulty,
    });
  }

  return gaps.slice(0, 15);
}

// ─── Public entry point ───────────────────────────────────────────────────────

/**
 * Fetches a full SEO snapshot for the given domain.
 * All sub-requests run in parallel to minimize latency.
 * Throws if DataForSEO credentials are not configured.
 */
export async function fetchSeoSnapshot(
  businessId: string,
  domain: string,
): Promise<SeoSnapshot> {
  if (!dataForSeoEnabled) {
    throw new Error("DataForSEO credentials not configured (DATAFORSEO_USERNAME / DATAFORSEO_PASSWORD).");
  }

  // Normalize domain (strip protocol/www)
  const normalizedDomain = domain
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/$/, "")
    .split("/")[0];

  const [overview, topKeywords, competitors, backlinks] = await Promise.all([
    fetchDomainOverview(normalizedDomain),
    fetchRankedKeywords(normalizedDomain),
    fetchCompetitors(normalizedDomain),
    fetchBacklinks(normalizedDomain),
  ]);

  const competitorDomains = competitors.map((c) => c.domain).filter(Boolean);
  const keywordGaps = await fetchKeywordGaps(normalizedDomain, competitorDomains).catch(
    () => [] as KeywordGap[],
  );

  return {
    businessId,
    domain: normalizedDomain,
    overview,
    topKeywords,
    competitors,
    backlinks,
    keywordGaps,
    fetchedAt: new Date().toISOString(),
  };
}
