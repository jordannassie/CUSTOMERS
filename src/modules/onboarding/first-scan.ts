import type { ScanStatus } from "@/modules/jobs";

// The first scan screen (B-38, MVP_SPEC 3.1 step 9). Pure, so the screen's states are unit tested.

/** "credits": waiting for the trial credits (F-48). "credits-late": they did not arrive in time. */
export type FirstScanPhase = "credits" | "credits-late" | "start" | "scanning" | "done" | "failed";

export const FIRST_SCAN_FAILED = "No credits were used. Try again in a moment.";
export const CREDITS_LATE = "Your trial credits are taking longer than usual. Try again in a minute.";

// Stripe sends invoice.paid within seconds of checkout.session.completed; this leaves room for a slow one.
export const CREDITS_WAIT_MS = 30_000;

/**
 * What the screen does next for a scan status: wait for the trial credits, start a scan, keep waiting,
 * open the dashboard, or offer a retry. `awaitingCredits` skips the "out of credits" block while the
 * trial credits are still on their way.
 */
export function firstScanPhase(status: ScanStatus, awaitingCredits = false): FirstScanPhase {
  if (status.scanning) return "scanning";
  if (status.lastResult === "done") return "done";
  if (awaitingCredits) return "credits";
  if (status.lastResult === "failed" || status.blockedReason) return "failed";
  return "start";
}

/** The message under a failed or blocked first scan: the plain reason when one is known. */
export function firstScanProblem(status: ScanStatus): string {
  return status.blockedReason ?? FIRST_SCAN_FAILED;
}

/** After a credits check (null when it failed): start the scan, check again, or give up for now. */
export function creditsWaitNext(waiting: boolean | null, elapsedMs: number): "start" | "wait" | "late" {
  if (waiting === false) return "start";
  return elapsedMs >= CREDITS_WAIT_MS ? "late" : "wait";
}
