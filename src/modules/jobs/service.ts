import type { LatestJob } from "./dal";

// What the Run scan button shows (B-29, MVP_SPEC 6.4). Pure, so the states are unit tested.

export type ScanStatus = {
  scanning: boolean;
  /** An attempt failed and the scan waits a few minutes to try again (MVP_SPEC 6.3). */
  retrying: boolean;
  /** How the latest finished scan ended; null before the first scan. */
  lastResult: "done" | "failed" | null;
  lastFinishedAt: string | null;
  /** Why a scan cannot start now (plain language), or null when it can. */
  blockedReason: string | null;
};

export function scanStatusView(
  job: (Pick<LatestJob, "status" | "finishedAt"> & { error?: string | null }) | null,
  canStart: { allowed: boolean; reason: string },
): ScanStatus {
  const scanning = job?.status === "queued" || job?.status === "running";
  const finished = job?.status === "done" || job?.status === "failed" ? job.status : null;
  return {
    scanning,
    retrying: job?.status === "queued" && !!job.error,
    lastResult: finished,
    lastFinishedAt: finished ? job!.finishedAt : null,
    blockedReason: scanning || canStart.allowed ? null : canStart.reason,
  };
}
