import "server-only";
import type { ProviderId } from "@/modules/scanning";
import { createServiceClient } from "@/lib/supabase/service";
import { scanFailuresFrom, scanSkipsFrom, type ScanFailures } from "../coverage";

export type LastScanFailures = {
  /** Null before the first finished scan. */
  runId: string | null;
  /** When that scan started: the questions it asked were added before then. */
  startedAt: string | null;
  failures: ScanFailures | null;
  /** The AIs it left out because they were unavailable. */
  skipped: ProviderId[];
};

/**
 * Which AIs failed in the latest finished scan of the business (BUG-074). Callers check the viewer may see this
 * business first.
 */
export async function loadLastScanFailures(businessId: string): Promise<LastScanFailures> {
  const { data, error } = await createServiceClient()
    .from("visibility_runs")
    .select("id, started_at, failed_by_provider")
    .eq("business_id", businessId)
    .in("status", ["completed", "failed"])
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`Overview: could not read the last scan: ${error.message}`);
  return {
    runId: data?.id ?? null,
    startedAt: data?.started_at ?? null,
    failures: scanFailuresFrom(data?.failed_by_provider),
    skipped: scanSkipsFrom(data?.failed_by_provider),
  };
}
