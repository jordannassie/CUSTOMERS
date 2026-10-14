import "server-only";
// Re-reads a business's website after a scan when its saved facts are over a month old (MVP_SPEC 7.1). Runs in the
// scan worker, so it imports only the scraper, the extractor and the service client (worker-bundle.test.ts).
import { env } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/service";
import { liveAiClients } from "@/modules/ai/server";
import type { Json } from "@/types/database.types";
import { providerErrorKind } from "@/lib/provider-error-kind";
import { createBusinessExtractor } from "../extract";
import { createFirecrawlScraper } from "../firecrawl";
import { createPlacesSearch, type SearchPlaces } from "../places";
import { findListing, needsListing } from "./listing";
import { readSiteFacts, siteFactsStale } from "./service";

export type SiteRefresh = "fresh" | "skipped" | "kept" | "refreshed";

type Db = ReturnType<typeof createServiceClient>;

/**
 * BUG-158: a business whose listing was not matched at setup is looked for again after each scan, one Places search
 * at a time. A failure (a 429 included) is recorded once in provider_errors and tried again at the next scan.
 */
export async function relinkListing(db: Db, businessId: string, domain: string, search: SearchPlaces): Promise<"linked" | "chain" | "none" | "failed"> {
  let match;
  try {
    match = await findListing(domain, search);
  } catch (error) {
    const message = `Listing check: ${error instanceof Error ? error.message : String(error)}`.slice(0, 500);
    const { error: logError } = await db.rpc("record_provider_error", { p_provider: "google_places", p_kind: providerErrorKind(message), p_message: message });
    if (logError) console.error(`Could not record the listing check error: ${logError.message}`);
    return "failed";
  }
  if (!match) return "none";
  const update = "chain" in match ? { is_chain: true } : { places_id: match.placesId };
  const { error } = await db.from("businesses").update(update).eq("id", businessId).is("places_id", null);
  if (error) throw new Error(`Listing check: could not save: ${error.message}`);
  return "chain" in match ? "chain" : "linked";
}

export async function refreshStaleSiteFacts(runId: string, now = new Date()): Promise<SiteRefresh> {
  const db = createServiceClient();
  const { data: run, error } = await db
    .from("visibility_runs")
    .select("business_id, businesses!inner(domain, has_website, owner_user_id, places_id, is_chain, agencies!inner(is_test))")
    .eq("id", runId)
    .maybeSingle();
  if (error) throw new Error(`Site refresh: could not load run: ${error.message}`);
  const b = run?.businesses as unknown as
    | { domain: string | null; has_website: boolean | null; owner_user_id: string; places_id: string | null; is_chain: boolean; agencies: { is_test: boolean } }
    | undefined;
  // Test agencies never spend real Firecrawl or AI calls (D-61); fixture mode has nothing real to read.
  const fixtures = env.ONBOARDING_FIXTURES === "true" && env.NODE_ENV !== "production";
  if (!run || !b?.domain || b.has_website === false || b.agencies.is_test || fixtures) return "skipped";
  if (env.GOOGLE_PLACES_API_KEY && needsListing({ domain: b.domain, hasWebsite: b.has_website, placesId: b.places_id, chain: b.is_chain })) {
    await relinkListing(db, run.business_id, b.domain, createPlacesSearch(env.GOOGLE_PLACES_API_KEY));
  }
  if (!env.FIRECRAWL_API_KEY || !(env.ANTHROPIC_API_KEY || env.OPENAI_API_KEY)) return "skipped";

  const saved = await db.from("business_site_facts").select("fetched_at").eq("business_id", run.business_id).maybeSingle();
  if (saved.error) throw new Error(`Site refresh: could not load facts: ${saved.error.message}`);
  if (!siteFactsStale(saved.data?.fetched_at, now)) return "fresh";

  const facts = await readSiteFacts(b.domain, {
    scrape: createFirecrawlScraper(env.FIRECRAWL_API_KEY),
    extract: createBusinessExtractor(liveAiClients({ accountUserId: b.owner_user_id, businessId: run.business_id })),
  });
  if (!facts) return "kept";
  const { error: saveError } = await db
    .from("business_site_facts")
    .upsert({ business_id: run.business_id, data: facts as unknown as Json, fetched_at: now.toISOString() });
  if (saveError) throw new Error(`Site refresh: could not save facts: ${saveError.message}`);
  return "refreshed";
}
