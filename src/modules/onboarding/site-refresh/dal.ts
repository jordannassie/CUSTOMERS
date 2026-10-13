import "server-only";
// Re-reads a business's website after a scan when its saved facts are over a month old (MVP_SPEC 7.1). Runs in the
// scan worker, so it imports only the scraper, the extractor and the service client (worker-bundle.test.ts).
import { env } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/service";
import { liveAiClients } from "@/modules/ai/server";
import type { Json } from "@/types/database.types";
import { createBusinessExtractor } from "../extract";
import { createFirecrawlScraper } from "../firecrawl";
import { readSiteFacts, siteFactsStale } from "./service";

export type SiteRefresh = "fresh" | "skipped" | "kept" | "refreshed";

export async function refreshStaleSiteFacts(runId: string, now = new Date()): Promise<SiteRefresh> {
  const db = createServiceClient();
  const { data: run, error } = await db
    .from("visibility_runs")
    .select("business_id, businesses!inner(domain, has_website, owner_user_id, agencies!inner(is_test))")
    .eq("id", runId)
    .maybeSingle();
  if (error) throw new Error(`Site refresh: could not load run: ${error.message}`);
  const b = run?.businesses as unknown as { domain: string | null; has_website: boolean | null; owner_user_id: string; agencies: { is_test: boolean } } | undefined;
  // Test agencies never spend real Firecrawl or AI calls (D-61); fixture mode has nothing real to read.
  const fixtures = env.ONBOARDING_FIXTURES === "true" && env.NODE_ENV !== "production";
  if (!run || !b?.domain || b.has_website === false || b.agencies.is_test || fixtures) return "skipped";
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
