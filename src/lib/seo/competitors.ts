import "server-only";
import type { CompetitorKeywordGap, SeoResult } from "@/types/seo";
import { getDefaultSeoProvider } from "./provider";

const NOT_CONFIGURED: SeoResult<never> = {
  ok: false,
  error: "No SEO provider is configured. Add DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD.",
};

/** Keywords a competitor's domain ranks for that the business doesn't rank
 * for (or ranks worse for) — the raw material for keyword-gap opportunities. */
export async function compareCompetitorKeywords(
  domain: string,
  competitorDomain: string,
  locationName: string | null,
): Promise<SeoResult<CompetitorKeywordGap[]>> {
  const provider = getDefaultSeoProvider();
  if (!provider) return NOT_CONFIGURED;
  return provider.compareCompetitorKeywords(domain, competitorDomain, locationName);
}
