import "server-only";
import type { BacklinkOverview, SeoResult } from "@/types/seo";
import { getDefaultSeoProvider } from "./provider";

const NOT_CONFIGURED: SeoResult<never> = {
  ok: false,
  error: "No SEO provider is configured. Add DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD.",
};

/** Backlink profile summary for a domain: referring domain/backlink counts
 * plus the top referring domains by link count — not a raw per-link dump. */
export async function getBacklinkOverview(domain: string): Promise<SeoResult<BacklinkOverview>> {
  const provider = getDefaultSeoProvider();
  if (!provider) return NOT_CONFIGURED;
  return provider.getBacklinkOverview(domain);
}
