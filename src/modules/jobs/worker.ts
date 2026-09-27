import "server-only";
// Scan job worker (B-27, MVP_SPEC 6.3, D-42): claims queued jobs, runs them in parallel, and marks each
// done, queued again with backoff, or failed. The host entry point only checks the secret and calls this.
import { explainAfterScan } from "@/modules/insights/server";
import { ALREADY_FINISHED, runScan, type ScanOutcome } from "@/modules/scanning";
import { claimScanJobs, finishJob, isWorkerSecret, workerTimeBudgetMs, type ClaimedJob, type JobUpdate } from "./dal";

export const CLAIM_LIMIT = 10;
export const MAX_ATTEMPTS = 3;
const RETRY_STEP_MS = 5 * 60 * 1000;
// Stop claiming once 90% of the budget is used; the budget already sits well under the host's hard limit.
const CLAIM_CUTOFF = 0.9;

export type WorkerDeps = {
  claim: (limit: number) => Promise<ClaimedJob[]>;
  run: (jobId: string) => Promise<ScanOutcome>;
  finish: (job: ClaimedJob, update: JobUpdate, now: Date) => Promise<boolean>;
  now: () => Date;
  /** "Why competitors win" after a finished scan (B-51). Its failure never changes the job. */
  explain?: (runId: string) => Promise<unknown>;
};

export type WorkerSummary = {
  claimed: number;
  done: number;
  retrying: number;
  failed: number;
  /** Jobs that another worker took over (reset as stuck) before this one finished them. */
  lost: number;
  stoppedForTime: boolean;
};

const liveDeps: WorkerDeps = {
  claim: claimScanJobs,
  run: (jobId) => runScan(jobId),
  finish: finishJob,
  now: () => new Date(),
  explain: explainAfterScan,
};

/** How a job ends after one attempt. A thrown error is treated like a scan where every check failed. */
export function jobUpdateFor(outcome: ScanOutcome | { status: "error"; error: string }, job: ClaimedJob, now: Date): JobUpdate {
  if (outcome.status === "done") {
    return { status: "done", creditsCharged: job.creditsCharged + outcome.charged, error: null };
  }
  if (outcome.status === "skipped") {
    // An earlier attempt finished the scan but died before saving the job.
    if (outcome.reason === ALREADY_FINISHED) return { status: "done", creditsCharged: job.creditsCharged, error: null };
    // Nothing was held; trying again minutes later would not change a missing plan or a paused business.
    return { status: "failed", error: outcome.reason };
  }
  const error = outcome.status === "error" ? outcome.error : failedChecksError(outcome.errors);
  if (job.attempts >= MAX_ATTEMPTS) return { status: "failed", error };
  return { status: "queued", runAfter: new Date(now.getTime() + RETRY_STEP_MS * job.attempts), error };
}

export async function runWorker(budgetMs: number, deps: WorkerDeps = liveDeps): Promise<WorkerSummary> {
  const started = deps.now().getTime();
  const summary: WorkerSummary = { claimed: 0, done: 0, retrying: 0, failed: 0, lost: 0, stoppedForTime: false };

  while (true) {
    if (deps.now().getTime() - started >= budgetMs * CLAIM_CUTOFF) {
      summary.stoppedForTime = true;
      break;
    }
    const jobs = await deps.claim(CLAIM_LIMIT);
    if (jobs.length === 0) break;
    summary.claimed += jobs.length;
    const results = await Promise.all(jobs.map((job) => runJob(job, deps)));
    for (const result of results) summary[result]++;
  }
  return summary;
}

async function runJob(job: ClaimedJob, deps: WorkerDeps): Promise<"done" | "retrying" | "failed" | "lost"> {
  let outcome: ScanOutcome | { status: "error"; error: string };
  try {
    outcome = await deps.run(job.id);
  } catch (err) {
    outcome = { status: "error", error: errorText(err) };
  }
  const update = jobUpdateFor(outcome, job, deps.now());
  try {
    if (!(await deps.finish(job, update, deps.now()))) return "lost";
  } catch (err) {
    // The job stays running; reset_stuck_jobs puts it back in the queue and the open hold resumes it.
    console.error(`scan worker: could not save job ${job.id}: ${errorText(err)}`);
    return "lost";
  }
  if (outcome.status === "done" && deps.explain) {
    try {
      await deps.explain(outcome.runId);
    } catch (err) {
      console.error(`scan worker: could not explain run ${outcome.runId}: ${errorText(err)}`);
    }
  }
  return update.status === "queued" ? "retrying" : update.status;
}

/**
 * Entry point for the host (Netlify background function, or a Vercel route if we move, D-41).
 * pg_net sends the secret in x-worker-secret.
 */
export async function handleWorkerRequest(req: Request, deps?: WorkerDeps): Promise<Response> {
  if (req.method !== "POST") return Response.json({ error: "Method not allowed" }, { status: 405 });
  if (!isWorkerSecret(req.headers.get("x-worker-secret"))) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const summary = await runWorker(workerTimeBudgetMs(), deps);
  return Response.json(summary);
}

function failedChecksError(errors: string[]): string {
  const unique = [...new Set(errors)];
  return `Every check failed: ${unique.join("; ")}`.slice(0, 1000);
}

function errorText(err: unknown): string {
  return (err instanceof Error ? err.message : String(err)).slice(0, 1000);
}
