import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Cost-control primitives for the usage-based DataForSEO integration
 * (Phase 9). Every provider call made from run-seo-analysis.ts is expected
 * to record a usage row here so cost-per-customer is knowable, and every
 * scheduled/refreshable step is expected to check `isFresh` first so a
 * "Run Scan" click doesn't repeatedly re-purchase the same data.
 */

export async function recordSeoUsage(
  supabase: SupabaseClient,
  event: {
    business_id: string;
    run_id: string | null;
    endpoint: string;
    units?: number;
    estimated_cost?: number | null;
  },
): Promise<void> {
  await supabase.from("seo_api_usage").insert({
    business_id: event.business_id,
    run_id: event.run_id,
    endpoint: event.endpoint,
    units: event.units ?? 1,
    estimated_cost: event.estimated_cost ?? null,
  });
}

export function isFresh(capturedAt: string | null | undefined, maxAgeDays: number): boolean {
  if (!capturedAt) return false;
  const ageMs = Date.now() - new Date(capturedAt).getTime();
  return ageMs < maxAgeDays * 24 * 60 * 60 * 1000;
}

/** How often each kind of SEO data is allowed to refresh from the provider
 * without an explicit `force`. Deliberately conservative — DataForSEO is
 * usage-based, and none of this data moves fast enough to justify refreshing
 * on every dashboard visit or "Run Scan" click. */
export const REFRESH_POLICY = {
  domainOverviewDays: 7,
  keywordDiscoveryDays: 14,
  competitorGapDays: 7,
  backlinkOverviewDays: 14,
} as const;
