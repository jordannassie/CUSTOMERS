import "server-only";
import type {
  BacklinkOverview,
  CompetitorKeywordGap,
  DomainOverview,
  KeywordIdea,
  RankedKeyword,
  SeoProviderId,
  SeoResult,
  SerpSnapshot,
} from "@/types/seo";

/**
 * Clean provider abstraction for SEO data — mirrors the shape of
 * src/lib/geo/providers (the AI visibility adapter pattern), so the rest of
 * the app never talks to a raw third-party API response. Every method
 * returns a typed SeoResult: `{ ok: true, data }` or an explicit
 * `{ ok: false, error }` — callers must never invent a number when they see
 * `ok: false`. Only one adapter (DataForSEO) exists today; the interface
 * exists so a second provider (e.g. Ahrefs, SEMrush's API) could be added
 * later without touching any call site.
 */
export interface SeoProviderAdapter {
  id: SeoProviderId;
  label: string;
  /** True when the required credentials are present. */
  isConfigured(): boolean;
  getDomainOverview(domain: string, locationName: string | null): Promise<SeoResult<DomainOverview>>;
  discoverKeywords(domain: string, locationName: string | null): Promise<SeoResult<KeywordIdea[]>>;
  getKeywordMetrics(keywords: string[], locationName: string | null): Promise<SeoResult<KeywordIdea[]>>;
  getDomainRankings(domain: string, locationName: string | null): Promise<SeoResult<RankedKeyword[]>>;
  compareCompetitorKeywords(
    domain: string,
    competitorDomain: string,
    locationName: string | null,
  ): Promise<SeoResult<CompetitorKeywordGap[]>>;
  getBacklinkOverview(domain: string): Promise<SeoResult<BacklinkOverview>>;
  getSerp(keyword: string, locationName: string | null): Promise<SeoResult<SerpSnapshot>>;
}

import { dataForSeoAdapter } from "./dataforseo";

const REGISTRY: Record<SeoProviderId, SeoProviderAdapter> = {
  dataforseo: dataForSeoAdapter,
};

export function listConfiguredSeoProviders(): SeoProviderAdapter[] {
  return Object.values(REGISTRY).filter((adapter) => adapter.isConfigured());
}

export function getSeoProvider(id: SeoProviderId): SeoProviderAdapter | null {
  return REGISTRY[id] ?? null;
}

/** The single SEO provider Customers.Direct currently ships with. */
export function getDefaultSeoProvider(): SeoProviderAdapter | null {
  return listConfiguredSeoProviders()[0] ?? null;
}

/** Builds a DataForSEO-style `location_name` string from what we have on a
 * business record — never guesses a location that wasn't stored. */
export function buildLocationName(city: string | null, region: string | null, country: string | null): string | null {
  const parts = [city, region, country].filter((p): p is string => Boolean(p && p.trim()));
  return parts.length > 0 ? parts.join(",") : null;
}
