import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { ABANDONED_ERROR, abandonedBefore } from "@/lib/scan-job-staleness";
import { releaseHold } from "@/modules/credits";
import { finishJob } from "../dal";

/**
 * Fails the scans the worker abandoned (lib/scan-job-staleness.ts): a running one through fail_scan_job (its hold
 * released and the schedule moved on in one transaction), a queued one with a compare-and-set on the due time it was
 * read with, then its hold, if a retry kept one open, released. Only answers already saved stay charged; nothing else
 * is. Called by Run scan for its business, and by every worker run for all of them. Returns how many it failed.
 */
export async function abandonStaleJobs(businessId: string | null, now = new Date()): Promise<number> {
  const db = createServiceClient();
  const before = abandonedBefore(now);
  let query = db
    .from("scan_jobs")
    .select("id, status, attempts, hold_id, run_after")
    .or(`and(status.eq.queued,run_after.lt.${before}),and(status.eq.running,locked_at.lt.${before})`)
    .limit(100);
  if (businessId) query = query.eq("business_id", businessId);
  const { data, error } = await query;
  if (error) throw new Error(`Could not look for abandoned scans: ${error.message}`);

  let failed = 0;
  for (const job of data) {
    if (job.status === "running") {
      const ended = await finishJob({ id: job.id, attempts: job.attempts, creditsCharged: 0 }, { status: "failed", error: ABANDONED_ERROR }, now);
      if (ended) failed++;
      continue;
    }
    const { data: ended, error: endError } = await db
      .from("scan_jobs")
      .update({ status: "failed", error: ABANDONED_ERROR, finished_at: now.toISOString(), locked_at: null })
      .eq("id", job.id)
      .eq("status", "queued")
      .eq("run_after", job.run_after)
      .select("id");
    if (endError) throw new Error(`Could not end an abandoned scan: ${endError.message}`);
    if (ended.length === 0) continue;
    failed++;
    if (job.hold_id) await releaseHold(job.hold_id);
  }
  return failed;
}
