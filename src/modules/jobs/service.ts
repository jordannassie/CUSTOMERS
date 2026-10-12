import type { LatestJob } from "./dal";

// What the Run scan button shows (B-29, MVP_SPEC 6.4). Pure, so the states are unit tested.

// No worker has picked the job up long after it was due (cron runs the worker every minute, Run scan starts it at
// once), or a running job has shown no sign of life for 15 minutes (a live scan refreshes locked_at as it goes,
// and reset_stuck_jobs only resets one after 20). Usually WORKER_URL, WORKER_SECRET or the
// schedule is missing, so the screen says so instead of spinning forever.
export const STALLED_QUEUED_MINUTES = 3;
export const STALLED_RUNNING_MINUTES = 15;

export type ScanStatus = {
  scanning: boolean;
  /** An attempt failed and the scan waits a few minutes to try again (MVP_SPEC 6.3). */
  retrying: boolean;
  /** Queued or running far longer than it should be: the worker is not running (STALLED_*_MINUTES). */
  stalled: boolean;
  /** How the latest finished scan ended; null before the first scan. */
  lastResult: "done" | "failed" | null;
  lastFinishedAt: string | null;
  /** Why a scan cannot start now (plain language), or null when it can. */
  blockedReason: string | null;
};

type JobView = Pick<LatestJob, "status" | "finishedAt"> & Partial<Pick<LatestJob, "error" | "runAfter" | "lockedAt">>;

export function scanStatusView(
  job: JobView | null,
  canStart: { allowed: boolean; reason: string },
  now = new Date(),
): ScanStatus {
  const scanning = job?.status === "queued" || job?.status === "running";
  // A skipped scan reads as one that did not run: the screen shows its reason like a failure's.
  const finished = job?.status === "done" ? "done" : job?.status === "failed" || job?.status === "skipped" ? "failed" : null;
  return {
    scanning,
    retrying: job?.status === "queued" && !!job.error,
    stalled: !!job && isStalled(job, now),
    lastResult: finished,
    lastFinishedAt: finished ? job!.finishedAt : null,
    blockedReason: scanning || canStart.allowed ? null : canStart.reason,
  };
}

function isStalled(job: JobView, now: Date): boolean {
  const minutesSince = (at: string | null | undefined) => (at ? (now.getTime() - new Date(at).getTime()) / 60_000 : 0);
  if (job.status === "queued") return minutesSince(job.runAfter) > STALLED_QUEUED_MINUTES;
  if (job.status === "running") return minutesSince(job.lockedAt) > STALLED_RUNNING_MINUTES;
  return false;
}
