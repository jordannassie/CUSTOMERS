import "server-only";
import type { KeywordIdea, SeoResult } from "@/types/seo";
import { getDefaultSeoProvider } from "./provider";

const NOT_CONFIGURED: SeoResult<never> = {
  ok: false,
  error: "No SEO provider is configured. Add DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD.",
};

/** Discovers keyword opportunities for a domain (site-based discovery — what
 * this site could plausibly rank for, not just what it already ranks for). */
export async function discoverKeywords(
  domain: string,
  locationName: string | null,
): Promise<SeoResult<KeywordIdea[]>> {
  const provider = getDefaultSeoProvider();
  if (!provider) return NOT_CONFIGURED;
  return provider.discoverKeywords(domain, locationName);
}

/** Gets volume/difficulty/CPC/intent for an explicit list of keywords. */
export async function getKeywordMetrics(
  keywords: string[],
  locationName: string | null,
): Promise<SeoResult<KeywordIdea[]>> {
  const provider = getDefaultSeoProvider();
  if (!provider) return NOT_CONFIGURED;
  return provider.getKeywordMetrics(keywords, locationName);
}
