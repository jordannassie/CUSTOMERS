import "server-only";
import type { DomainOverview, RankedKeyword, SeoResult } from "@/types/seo";
import { getDefaultSeoProvider } from "./provider";

const NOT_CONFIGURED: SeoResult<never> = {
  ok: false,
  error: "No SEO provider is configured. Add DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD.",
};

/** High-level organic-visibility summary for a domain: ranking keyword
 * count, estimated traffic, and an authority-equivalent domain rank. */
export async function getDomainOverview(
  domain: string,
  locationName: string | null,
): Promise<SeoResult<DomainOverview>> {
  const provider = getDefaultSeoProvider();
  if (!provider) return NOT_CONFIGURED;
  return provider.getDomainOverview(domain, locationName);
}

/** The actual keywords a domain currently ranks for in organic search. */
export async function getDomainRankings(
  domain: string,
  locationName: string | null,
): Promise<SeoResult<RankedKeyword[]>> {
  const provider = getDefaultSeoProvider();
  if (!provider) return NOT_CONFIGURED;
  return provider.getDomainRankings(domain, locationName);
}
