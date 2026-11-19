import { REASONS } from "@/modules/entitlements";
import { scanStatusView } from "./service";

// The app's alert bell (owner, 2026-11-17): each business whose newest scan failed, was skipped or never finished. Pure;
// dal.ts scanProblems reads the jobs.

export type ScanProblem = { businessId: string; jobId: string; reason: string; at: string | null };

/** Skips for the whole account: the bell already has that account alert (out of credits, trial over, payment failed). */
const ACCOUNT_REASONS = new Set<string>([
  REASONS.trialOver,
  REASONS.pastDue,
  REASONS.canceled,
  REASONS.readOnly,
  REASONS.paused,
  REASONS.outOfCredits,
  REASONS.testOutOfCredits,
  REASONS.setupUnfinished,
]);

const GENERIC = "Your last scan didn't finish, so nothing was charged for the answers it missed. Run a scan again, or contact us if it keeps happening.";

export type ProblemJob = { id: string; business_id: string; status: string; finished_at: string | null; error: string | null; run_after: string; locked_at: string | null };

/** What the bell says about one business's newest scan, or null when it ran, is running, or the account alert covers it. */
export function scanProblem(job: ProblemJob, now = new Date()): ScanProblem | null {
  const view = scanStatusView(
    { status: job.status as "done", finishedAt: job.finished_at, error: job.error, runAfter: job.run_after, lockedAt: job.locked_at },
    { allowed: true, reason: "" },
    now,
  );
  if (view.lastResult !== "failed") return null;
  const error = job.error ?? "";
  if (job.status === "skipped" && (ACCOUNT_REASONS.has(error) || error.startsWith("This scan needs "))) return null;
  // A skip stores the reason the customer sees (entitlements); a failure stores developer text, said plainly instead.
  const reason = view.failedReason ?? (job.status === "skipped" && error ? error : GENERIC);
  return { businessId: job.business_id, jobId: job.id, reason, at: job.finished_at ?? job.locked_at ?? job.run_after };
}
