/** Normalized SEO data types — independent of the DataForSEO response format. */

export interface SeoKeyword {
  keyword: string;
  position: number;
  searchVolume: number;
  difficulty?: number;
  cpc?: number;
  /** Ranking page URL */
  url?: string;
  /** Position change vs previous period (negative = improved) */
  positionChange?: number;
}

export interface SeoCompetitorDomain {
  domain: string;
  keywords: number;
  organicTraffic: number;
  trafficCost?: number;
}

export interface BacklinkSummary {
  referringDomains: number;
  backlinks: number;
  referringPages?: number;
  /** Domain rank / authority score 0–100 */
  rank?: number;
}

export interface DomainOverview {
  /** Total estimated ranking keywords */
  keywords: number;
  /** Estimated monthly organic traffic */
  organicTraffic: number;
  /** Estimated traffic value in USD */
  trafficCost?: number;
  /** DataForSEO domain rank 0–100 */
  rank?: number;
}

export interface KeywordGap {
  keyword: string;
  /** Competitor domain that ranks for this keyword */
  competitorDomain: string;
  /** Competitor's position */
  competitorPosition: number;
  searchVolume: number;
  difficulty?: number;
}

export interface SeoSnapshot {
  businessId: string;
  domain: string;
  overview: DomainOverview;
  topKeywords: SeoKeyword[];
  competitors: SeoCompetitorDomain[];
  backlinks: BacklinkSummary;
  keywordGaps: KeywordGap[];
  fetchedAt: string;
}

export type SeoFetchResult =
  | { ok: true; snapshot: SeoSnapshot; cached: boolean }
  | { ok: false; reason: "not_configured" | "no_domain" | "api_error"; message: string };
