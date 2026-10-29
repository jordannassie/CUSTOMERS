import "server-only";
// Scan job worker (B-27, MVP_SPEC 6.3, D-42): claims queued jobs, runs them in parallel, and marks each
// done, queued again with backoff, or failed. The host entry point only checks the secret and calls this.
import { claimExplanation, explainAfterScan, runsToSweep, unexplainedRunOfJob } from "@/modules/insights/server";
import { refreshStaleSiteFacts } from "@/modules/onboarding/server";
import { ALREADY_FINISHED, isMissingSample, NO_SAMPLE_ANSWERS, runScan, type ScanOutcome } from "@/modules/scanning";
import { claimScanJobs, finishJob, isWorkerSecret, workerTimeBudgetMs, type ClaimedJob, type JobUpdate } from "./dal";

export const CLAIM_LIMIT = 10;
export const MAX_ATTEMPTS = 3;
const RETRY_STEP_MS = 5 * 60 * 1000;
// Stop claiming once 90% of the budget is used; the budget already sits well under the host's hard limit.
const CLAIM_CUTOFF = 0.9;
// An explanation takes up to 2 minutes, its backup as long again (insights EXPLAIN_WAIT_MS). With less of the budget
// left it is not started: the host could stop it before the fixes are saved, so the sweep explains the run later.
export const EXPLAIN_RESERVE_MS = 4 * 60_000;
// Runs the sweep explains per worker run at most, so a backlog never crowds out the scans.
export const SWEEP_LIMIT = 3;

export type WorkerDeps = {
  claim: (limit: number) => Promise<ClaimedJob[]>;
  run: (jobId: string) => Promise<ScanOutcome>;
  finish: (job: ClaimedJob, update: JobUpdate, now: Date) => Promise<boolean>;
  now: () => Date;
  /** "Why competitors win" after a finished scan (B-51). Its failure never changes the job. */
  explain?: (runId: string) => Promise<unknown>;
  /** The finished run of a job an earlier attempt completed, when its explanation never ran; null otherwise. */
  unexplainedRun?: (jobId: string) => Promise<string | null>;
  /** Recently finished runs left without fixes, and the claim that keeps two workers from explaining one twice. */
  sweep?: { find: (now: Date, limit: number) => Promise<string[]>; claim: (runId: string, now: Date) => Promise<boolean> };
};

export type WorkerSummary = {
  claimed: number;
  done: number;
  retrying: number;
  failed: number;
  /** Scans that had nothing to scan (B5). */
  skipped: number;
  /** Jobs that another worker took over (reset as stuck) before this one finished them. */
  lost: number;
  stoppedForTime: boolean;
  /** Explanations not started for lack of time; the sweep picks them up later. */
  explainsDeferred: number;
  /** Earlier runs without fixes that this run explained. */
  swept: number;
};

const liveDeps: WorkerDeps = {
  claim: claimScanJobs,
  run: (jobId) => runScan(jobId),
  finish: finishJob,
  now: () => new Date(),
  // Advice reads the website facts, so stale ones are refreshed first; a failed refresh keeps the old facts.
  explain: async (runId: string) => {
    await refreshStaleSiteFacts(runId).catch((err) => console.error(`scan worker: site refresh for run ${runId} failed: ${errorText(err)}`));
    return explainAfterScan(runId);
  },
  unexplainedRun: unexplainedRunOfJob,
  sweep: { find: runsToSweep, claim: claimExplanation },
};

/** How a job ends after one attempt. A thrown error is treated like a scan where every check failed. */
export function jobUpdateFor(outcome: ScanOutcome | { status: "error"; error: string }, job: ClaimedJob, now: Date): JobUpdate {
  if (outcome.status === "done") {
    return { status: "done", creditsCharged: job.creditsCharged + outcome.charged, error: null };
  }
  if (outcome.status === "skipped") {
    // An earlier attempt finished the scan but died before saving the job.
    if (outcome.reason === ALREADY_FINISHED) return { status: "done", creditsCharged: job.creditsCharged, error: null };
    // Nothing was held; trying again minutes later would not change a missing plan or a paused business. It is
    // not a failure either (B5): alerts ignore it and the business's next scan moves on.
    return { status: "skipped", error: outcome.reason };
  }
  const error = outcome.status === "error" ? outcome.error : failedChecksError(outcome.errors);
  // A test business with no sample answers of its trade and city gets none on a retry either (BUG-072): it fails
  // at once, so the screen says why instead of "trying again" and the stuck jobs alert does not keep it open. That
  // holds when other models have no recordings at all; a real outage among the errors still retries.
  const noSamples =
    outcome.status === "failed" &&
    outcome.errors.some((e) => e.includes(NO_SAMPLE_ANSWERS)) &&
    outcome.errors.every(isMissingSample);
  if (noSamples || job.attempts >= MAX_ATTEMPTS) return { status: "failed", error };
  return { status: "queued", runAfter: new Date(now.getTime() + RETRY_STEP_MS * job.attempts), error };
}

export async function runWorker(budgetMs: number, deps: WorkerDeps = liveDeps): Promise<WorkerSummary> {
  const started = deps.now().getTime();
  const remaining = () => budgetMs - (deps.now().getTime() - started);
  const summary: WorkerSummary = { claimed: 0, done: 0, retrying: 0, failed: 0, skipped: 0, lost: 0, stoppedForTime: false, explainsDeferred: 0, swept: 0 };

  while (true) {
    if (deps.now().getTime() - started >= budgetMs * CLAIM_CUTOFF) {
      summary.stoppedForTime = true;
      break;
    }
    const jobs = await deps.claim(CLAIM_LIMIT);
    if (jobs.length === 0) break;
    summary.claimed += jobs.length;
    const results = await Promise.all(jobs.map((job) => runJob(job, deps, remaining, summary)));
    for (const result of results) summary[result]++;
  }
  await sweepUnexplained(deps, remaining, summary);
  return summary;
}

async function runJob(
  job: ClaimedJob,
  deps: WorkerDeps,
  remaining: () => number,
  summary: WorkerSummary,
): Promise<"done" | "retrying" | "failed" | "skipped" | "lost"> {
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
  const runId = await runToExplain(job, outcome, deps);
  if (runId && deps.explain) {
    if (remaining() < EXPLAIN_RESERVE_MS) {
      // Left for the sweep: started now, the host could stop it before the fixes are saved.
      summary.explainsDeferred++;
      console.warn(`scan worker: too little time left to explain run ${runId}; the sweep explains it later`);
    } else {
      await explainSafely(runId, deps.explain);
    }
  }
  return update.status === "queued" ? "retrying" : update.status;
}

/** The run to explain after a job: the scan just finished, or one an earlier attempt finished before it died. */
async function runToExplain(job: ClaimedJob, outcome: ScanOutcome | { status: "error"; error: string }, deps: WorkerDeps): Promise<string | null> {
  if (outcome.status === "done") return outcome.runId;
  if (outcome.status !== "skipped" || outcome.reason !== ALREADY_FINISHED || !deps.unexplainedRun) return null;
  try {
    return await deps.unexplainedRun(job.id);
  } catch (err) {
    console.error(`scan worker: could not look up the run of job ${job.id}: ${errorText(err)}`);
    return null;
  }
}

async function explainSafely(runId: string, explain: (runId: string) => Promise<unknown>): Promise<void> {
  try {
    await explain(runId);
  } catch (err) {
    console.error(`scan worker: could not explain run ${runId}: ${errorText(err)}`);
  }
}

/**
 * Explains a few recently finished runs that never got their fixes (deferred above, or the host stopped the worker
 * part way), while the budget still has room for one. Claiming sets explained_at first, so a sweep stopped part way
 * loses that run's fixes; it only starts with EXPLAIN_RESERVE_MS left, which makes that rare.
 */
async function sweepUnexplained(deps: WorkerDeps, remaining: () => number, summary: WorkerSummary): Promise<void> {
  const { sweep, explain } = deps;
  if (!sweep || !explain || remaining() < EXPLAIN_RESERVE_MS) return;
  let runIds: string[];
  try {
    runIds = await sweep.find(deps.now(), SWEEP_LIMIT);
  } catch (err) {
    console.error(`scan worker: could not look for runs without fixes: ${errorText(err)}`);
    return;
  }
  await Promise.all(
    runIds.map(async (runId) => {
      if (remaining() < EXPLAIN_RESERVE_MS) return;
      const mine = await sweep.claim(runId, deps.now()).catch((err) => {
        console.error(`scan worker: could not take run ${runId} to explain: ${errorText(err)}`);
        return false;
      });
      if (!mine) return;
      summary.swept++;
      await explainSafely(runId, explain);
    }),
  );
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
