// Domain types for the Customers.Direct SEO intelligence layer.
// Mirrors supabase/migrations/009_seo_intelligence_schema.sql, following the
// same conventions as src/types/geo.ts.

export type SeoProviderId = "dataforseo";

// --- Stored rows (mirror the DB schema) -------------------------------------

export interface SeoDomainSnapshot {
  id: string;
  business_id: string;
  domain: string;
  organic_keywords: number | null;
  estimated_traffic: number | null;
  estimated_traffic_value: number | null;
  referring_domains: number | null;
  backlinks: number | null;
  domain_rank: number | null;
  provider: SeoProviderId;
  raw_data: unknown;
  captured_at: string;
}

export type SearchIntent = "informational" | "navigational" | "commercial" | "transactional" | null;

export interface SeoKeyword {
  id: string;
  business_id: string;
  keyword: string;
  search_volume: number | null;
  difficulty: number | null;
  cpc: number | null;
  intent: SearchIntent;
  current_position: number | null;
  previous_position: number | null;
  ranking_url: string | null;
  location: string;
  provider: SeoProviderId;
  tracked: boolean;
  discovered_at: string;
  updated_at: string;
}

export interface SeoCompetitorKeyword {
  id: string;
  business_id: string;
  competitor_id: string;
  keyword: string;
  search_volume: number | null;
  difficulty: number | null;
  competitor_position: number | null;
  business_position: number | null;
  competitor_url: string | null;
  opportunity_score: number | null;
  captured_at: string;
}

export interface SeoReferringDomain {
  id: string;
  business_id: string;
  domain: string;
  target: "business" | "competitor";
  competitor_id: string | null;
  backlinks: number | null;
  first_seen: string | null;
  domain_rank: number | null;
  provider: SeoProviderId;
  captured_at: string;
}

export type SeoRunType = "full" | "domain_overview" | "keywords" | "competitors" | "backlinks";
export type SeoRunStatus = "pending" | "running" | "completed" | "failed";

export interface SeoRun {
  id: string;
  business_id: string;
  type: SeoRunType;
  status: SeoRunStatus;
  provider: SeoProviderId;
  started_at: string;
  completed_at: string | null;
  error: string | null;
  created_at: string;
}

export interface SeoApiUsage {
  id: string;
  business_id: string;
  run_id: string | null;
  provider: SeoProviderId;
  endpoint: string;
  units: number;
  estimated_cost: number | null;
  created_at: string;
}

// --- Provider-layer result types --------------------------------------------
// Every provider call returns one of these — never a raw provider response —
// so the rest of the app never needs to know DataForSEO's response shape.
// `ok: false` is the explicit "unavailable" state (missing credentials, a
// failed request, or a malformed response) — callers must never fabricate
// numbers when they see it.

export type SeoResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export interface DomainOverview {
  domain: string;
  organicKeywords: number | null;
  estimatedTraffic: number | null;
  estimatedTrafficValue: number | null;
  referringDomains: number | null;
  backlinks: number | null;
  domainRank: number | null;
  raw: unknown;
}

export interface KeywordIdea {
  keyword: string;
  searchVolume: number | null;
  difficulty: number | null;
  cpc: number | null;
  intent: SearchIntent;
}

export interface RankedKeyword {
  keyword: string;
  position: number | null;
  searchVolume: number | null;
  difficulty: number | null;
  url: string | null;
}

export interface CompetitorKeywordGap {
  keyword: string;
  searchVolume: number | null;
  difficulty: number | null;
  competitorPosition: number | null;
  businessPosition: number | null;
  competitorUrl: string | null;
}

export interface ReferringDomainEntry {
  domain: string;
  backlinks: number | null;
  firstSeen: string | null;
  domainRank: number | null;
}

export interface BacklinkOverview {
  domain: string;
  referringDomains: number | null;
  backlinks: number | null;
  topReferringDomains: ReferringDomainEntry[];
}

export interface SerpItem {
  position: number;
  title: string;
  url: string;
  domain: string;
}

export interface SerpSnapshot {
  keyword: string;
  location: string | null;
  items: SerpItem[];
}

export interface SeoUsageEvent {
  endpoint: string;
  units: number;
  estimatedCost: number | null;
}
