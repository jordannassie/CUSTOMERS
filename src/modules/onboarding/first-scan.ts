import type { ScanStatus } from "@/modules/jobs";

// The first scan screen (B-38, MVP_SPEC 3.1 step 9). Pure, so the screen's states are unit tested.

/** "credits": waiting for the trial credits (F-48). "credits-late": they did not arrive in time. */
export type FirstScanPhase = "credits" | "credits-late" | "start" | "scanning" | "done" | "failed";

export const FIRST_SCAN_FAILED = "No credits were used. Try again in a moment.";
export const FIRST_SCAN_STALLED =
  "Your scan is waiting longer than usual to run. It stays in line and finishes on its own, and you're only charged for answers we get. You can leave this page. If your score isn't on the dashboard within an hour, contact us.";
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

/** What the screen is showing: a phase, or a scan no worker has picked up yet. */
export type FirstScanView = FirstScanPhase | "stalled";

/** The heading and the sentence under it for each state of the screen. */
export function firstScanCopy(
  view: FirstScanView,
  { business, models, asked }: { business: string; models: string[]; asked: string },
): { heading: string; intro: string } {
  const names = listOf(models);
  switch (view) {
    case "credits-late":
      return { heading: "Your trial credits aren't in yet", intro: `We start checking ${business} as soon as your trial credits are in your account.` };
    case "credits":
      return { heading: "Getting your first scan ready", intro: `We start checking ${business} as soon as your trial credits are in your account.` };
    case "failed":
      return { heading: "Your first scan didn't finish", intro: `We couldn't finish checking ${business}.` };
    case "stalled":
      return { heading: "Your first scan is taking longer than usual", intro: `${business} is in line to be checked by ${names}.` };
    case "done":
      return {
        heading: "Your first scan is done",
        intro: `We asked ${names} ${asked} your customers ask and looked for ${business} in every answer.`,
      };
    default:
      return {
        heading: "Running your first scan",
        intro: `We're asking ${names} ${asked} your customers ask, and looking for ${business} in every answer.`,
      };
  }
}

function listOf(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "AI";
  return `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
}
