import type { ScanStatus } from "@/modules/jobs";

// The first scan screen (B-38, MVP_SPEC 3.1 step 9). Pure, so the screen's states are unit tested.

export type FirstScanPhase = "start" | "scanning" | "done" | "failed";

export const FIRST_SCAN_FAILED = "No credits were used. Try again in a moment.";

/** What the screen does next for a scan status: start one, keep waiting, open the dashboard, or offer a retry. */
export function firstScanPhase(status: ScanStatus): FirstScanPhase {
  if (status.scanning) return "scanning";
  if (status.lastResult === "done") return "done";
  if (status.lastResult === "failed" || status.blockedReason) return "failed";
  return "start";
}

/** The message under a failed or blocked first scan: the plain reason when one is known. */
export function firstScanProblem(status: ScanStatus): string {
  return status.blockedReason ?? FIRST_SCAN_FAILED;
}
