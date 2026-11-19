import "server-only";
import type { ProviderId } from "@/modules/scanning";
import { createServiceClient } from "@/lib/supabase/service";
import { scanFailuresFrom, scanNoticeText, scanSkipsFrom, type ScanFailures } from "../coverage";

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

/** One business whose newest finished scan left an AI unchecked, with the notice its Overview shows. */
export type LastScanNotice = { businessId: string; runId: string; at: string | null; text: string };

/**
 * The Overview's "In the last scan, Perplexity couldn't be checked" notice for several businesses at once, for the
 * app's alert bell: it said "No alerts" while the page showed the notice. Three reads for all the businesses together,
 * since the bell is built on every page. Callers pass only the signed-in user's own businesses.
 */
export async function lastScanNotices(businessIds: string[]): Promise<LastScanNotice[]> {
  if (businessIds.length === 0) return [];
  const db = createServiceClient();
  const [runs, businesses, questions] = await Promise.all([
    db
      .from("visibility_runs")
      .select("id, business_id, started_at, failed_by_provider")
      .in("business_id", businessIds)
      .in("status", ["completed", "failed"])
      .order("started_at", { ascending: false })
      .limit(Math.min(500, businessIds.length * 20)),
    db.from("businesses").select("id, models").in("id", businessIds),
    db.from("tracked_prompts").select("business_id, created_at").in("business_id", businessIds).eq("active", true).is("removed_at", null),
  ]);
  for (const r of [runs, businesses, questions]) if (r.error) throw new Error(`Overview: could not read the last scans: ${r.error.message}`);

  const newest = new Map<string, NonNullable<typeof runs.data>[number]>();
  for (const run of runs.data ?? []) if (!newest.has(run.business_id)) newest.set(run.business_id, run);
  const models = new Map((businesses.data ?? []).map((b) => [b.id, (b.models ?? []) as ProviderId[]]));
  const notices: LastScanNotice[] = [];
  for (const [businessId, run] of newest) {
    const start = run.started_at ? Date.parse(run.started_at) : NaN;
    const active = (questions.data ?? []).filter((q) => q.business_id === businessId);
    // The questions that scan asked, as the Questions page counts them (askedInScan): added before it started.
    const asked = active.filter((q) => q.created_at && Date.parse(q.created_at) < start).length || active.length;
    const text = scanNoticeText(models.get(businessId) ?? [], scanFailuresFrom(run.failed_by_provider), asked, scanSkipsFrom(run.failed_by_provider));
    if (text) notices.push({ businessId, runId: run.id, at: run.started_at, text });
  }
  return notices;
}
