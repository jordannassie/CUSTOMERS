// When a scan job counts as abandoned (MVP test, 2026-11-14). A queued job the worker has not picked up for two hours
// after it was due, or a running job that has shown no sign of life for two hours (a live scan refreshes locked_at as
// it goes, and reset_stuck_jobs requeues a quiet one after 20 minutes whenever the worker runs), will not finish: the
// worker is not running for it. Such a job no longer blocks Run scan; the next Run scan or worker run marks it failed,
// uncharged. Shared by the scan button (jobs) and the scan rules (entitlements). Pure.

export const ABANDONED_MINUTES = 120;

export type JobTiming = { status: string; runAfter?: string | null; lockedAt?: string | null };

export function isAbandonedJob(job: JobTiming, now = new Date()): boolean {
  const minutesSince = (at: string | null | undefined) => (at ? (now.getTime() - new Date(at).getTime()) / 60_000 : 0);
  if (job.status === "queued") return minutesSince(job.runAfter) > ABANDONED_MINUTES;
  if (job.status === "running") return minutesSince(job.lockedAt) > ABANDONED_MINUTES;
  return false;
}

/** The moment before which a queued job's due time, or a running job's last sign of life, makes it abandoned. */
export function abandonedBefore(now = new Date()): string {
  return new Date(now.getTime() - ABANDONED_MINUTES * 60_000).toISOString();
}

/** Saved as the failed job's error; the scan screens show the plain sentence for it. */
export const ABANDONED_ERROR = "Abandoned: the worker never finished this scan";
