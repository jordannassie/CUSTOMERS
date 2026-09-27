import type { LatestJob } from "./dal";

// What the Run scan button shows (B-29, MVP_SPEC 6.4). Pure, so the states are unit tested.

export type ScanStatus = {
  scanning: boolean;
  /** How the latest finished scan ended; null before the first scan. */
  lastResult: "done" | "failed" | null;
  lastFinishedAt: string | null;
  /** Why a scan cannot start now (plain language), or null when it can. */
  blockedReason: string | null;
};

export function scanStatusView(job: LatestJob | null, canStart: { allowed: boolean; reason: string }): ScanStatus {
  const scanning = job?.status === "queued" || job?.status === "running";
  const finished = job?.status === "done" || job?.status === "failed" ? job.status : null;
  return {
    scanning,
    lastResult: finished,
    lastFinishedAt: finished ? job!.finishedAt : null,
    blockedReason: scanning || canStart.allowed ? null : canStart.reason,
  };
}
