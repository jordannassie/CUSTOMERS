import "server-only";
// Run a scan (B-26, MVP_SPEC 5.2, 4.2, D-53, D-54): hold the credits, run every question on every
// chosen model, charge 1 credit per successful check with a new answer, then return the rest of the hold. An answer
// reused from the shared cache is free for now (D-24, changed 2026-10-20 at the owner's request).
import { captureCredits, holdCredits, InsufficientCreditsError, isHoldOpen, releaseHold } from "@/modules/credits";
import { canRunScanJob, REASONS } from "@/modules/entitlements";
import { captureBatcher } from "./capture-batch";
import { forEachLimited, summarise } from "./run-limited";
import { runOneCheck, type CheckContext, type CheckOutcome, type CheckTask } from "./check";
import { providerDown } from "./providers/request";
import { claudeGate } from "./claude-outage/gate";
import { CLAUDE_SKIPPED, claudeMode, type OutageStore } from "./claude-outage/outage";
import { liveOutageStore } from "./claude-outage/dal";
import type { ExtractNames } from "./extract";
import { mentionTargets } from "./recount/service";
import type { ProviderFailures, ProviderId, RunCheck } from "./providers/types";
import { loadRecordedAnswers, recordedAnswers, RECORDED_ANSWERS_DIR } from "./recorded";
import { checkTasks, isProvider, locationOf, PROVIDERS, scanBlocker } from "./scan-tasks";
import { nextScanAt } from "./schedule";
import {
  finishRun,
  findOrCreateRun,
  listSavedCheckIds,
  liveCheckRunner,
  liveNameExtractor,
  loadScanJob,
  loadScanTarget,
  setNextScanAt,
  touchScanJob,
  type ScanTargetRow,
} from "./runs/dal";

// MVP_SPEC 5.2: 4 to 6 checks at a time per scan.
export const CHECKS_AT_ONCE = 5;

// A running scan refreshes its job at most this often, as its checks finish (B4).
const HEARTBEAT_MS = 60 * 1000;

/** The skip reason when a job's hold is already closed: an earlier run finished it. */
export const ALREADY_FINISHED = "This scan already finished.";

export type ScanDeps = {
  /** Live adapters by default; tests pass mocks. Null means the provider has no API key. */
  checkRunner: (provider: ProviderId) => RunCheck | null;
  extractNames: ExtractNames | null;
  recordedDir: string;
  now: () => Date;
  /** Where the Claude outage is kept (an open admin alert); tests pass one in memory. */
  claudeOutage: OutageStore;
};

export type ScanOutcome =
  | { status: "skipped"; reason: string }
  | {
      status: "done" | "failed";
      runId: string;
      checks: number;
      failed: number;
      charged: number;
      released: number;
      /** Claude checks left out because Claude is unavailable: never held at the start, never charged. */
      skipped: number;
      errors: string[];
      /** Failed because the AI tools were not answering (BUG-285): every check that ran failed that way. */
      outage?: boolean;
    };

/**
 * Runs one claimed scan job to the end. "skipped" means nothing was held or charged (the reason is for the
 * job's error field); "failed" means every check failed, so nothing was charged. Throws only on database
 * errors; the hold stays open, so running the same job again resumes it without charging any check twice.
 */
export async function runScan(jobId: string, overrides: Partial<ScanDeps> = {}): Promise<ScanOutcome> {
  const job = await loadScanJob(jobId);
  const target = await loadScanTarget(job.businessId, job.agencyId);
  const blocker = scanBlocker(target);
  if (blocker) return { status: "skipped", reason: blocker };

  // A retried job already holds its credits; a started scan always finishes (D-54).
  if (!job.holdId) {
    const allowed = await canRunScanJob(job.agencyId, job.businessId);
    if (!allowed.allowed) return { status: "skipped", reason: allowed.reason };
  }

  // While Claude is unavailable (a rejected key, no credit, not answering), its checks are left out before the hold (claude-outage/outage.ts).
  const outageStore = overrides.claudeOutage ?? liveOutageStore;
  const askClaude = !target.isTest && target.business.models.includes("anthropic");
  const openOutage = askClaude ? await outageStore.read() : null;
  const mode = claudeMode(openOutage, (overrides.now ?? (() => new Date()))());
  const allTasks = checkTasks(jobId, target);
  const tasks = mode === "skip" ? allTasks.filter((t) => t.provider !== "anthropic") : allTasks;
  const skippedAtStart = allTasks.length - tasks.length;
  // Only Claude chosen and Claude out: nothing to hold. A retried job goes on, so its open hold is still released.
  if (tasks.length === 0 && !job.holdId) return { status: "skipped", reason: CLAUDE_SKIPPED };
  let holdId: string;
  try {
    holdId = await holdCredits(job.agencyId, tasks.length, jobId);
  } catch (err) {
    if (err instanceof InsufficientCreditsError) return { status: "skipped", reason: REASONS.outOfCredits };
    throw err;
  }
  if (!(await isHoldOpen(holdId))) return { status: "skipped", reason: ALREADY_FINISHED };

  const models = target.business.models.filter(isProvider);
  const run = await findOrCreateRun({ jobId, businessId: job.businessId, provider: models.join(",") });
  const saved = await listSavedCheckIds(run.id);
  const ctx = await checkContext(target, run.id, overrides);

  const capture = captureBatcher((checkIds) => captureCredits(holdId, checkIds));
  const errors: string[] = [];
  const failures: ProviderFailures = {};
  const gate = claudeGate(outageStore, mode, openOutage?.reason ?? null);
  let notAnswering = 0;
  let lastBeat = ctx.now().getTime();
  const runTask = async (task: CheckTask) => {
    if (gate.skip(task)) return;
    const savedCached = saved.get(task.checkId);
    const outcome: CheckOutcome =
      savedCached !== undefined ? { ok: true, cached: savedCached } : await runOneCheck(task, ctx.forProvider(task.provider));
    await gate.after(task, outcome, savedCached === undefined);
    // Tell the reset job this scan is alive, so a long one is not taken for a dead worker and run twice (B4).
    if (ctx.now().getTime() - lastBeat >= HEARTBEAT_MS) {
      lastBeat = ctx.now().getTime();
      await touchScanJob(jobId).catch((err) => console.error(`scan ${jobId}: could not refresh the job: ${err instanceof Error ? err.message : err}`));
    }
    if (!outcome.ok) {
      errors.push(outcome.error);
      if (outcome.outage || (outcome.kind && providerDown(outcome.kind))) notAnswering++;
      const seen = failures[task.provider];
      failures[task.provider] = { failed: (seen?.failed ?? 0) + 1, reason: seen?.reason ?? outcome.reason };
      return;
    }
    // A reused answer costs nothing: its held credit goes back with the rest of the hold (D-24).
    if (outcome.cached) return;
    // Capture right after each check, so a scan cut off halfway has charged exactly what it saved.
    await capture.add(task.checkId);
  };
  // After the outage window one Claude check goes first, alone, so a key that still fails costs one call (probe).
  const probed = new Set<string>();
  for (const task of tasks.filter((t) => t.provider === "anthropic")) {
    if (!gate.probing()) break;
    probed.add(task.checkId);
    await runTask(task);
  }
  await forEachLimited(
    tasks.filter((t) => !probed.has(t.checkId)),
    CHECKS_AT_ONCE,
    runTask,
  );
  if (askClaude) await gate.finish();
  const charged = capture.charged();
  const skipped = skippedAtStart + gate.skipped();
  if (skipped > 0) failures.anthropic = { failed: failures.anthropic?.failed ?? 0, reason: CLAUDE_SKIPPED, skipped };

  // The run is finished and the next scan set before the hold closes. If either write fails, the worker retries a
  // job whose hold is still open, so the retry re-uses the saved checks, charges none twice and finishes the run.
  // Closing the hold first left the run "running" and the due date in the past for good.
  const attempted = tasks.length - gate.skipped();
  const allFailed = attempted === 0 || errors.length === attempted;
  await finishRun(run.id, {
    status: allFailed ? "failed" : "completed",
    checksTotal: tasks.length,
    checksFailed: errors.length,
    error: errors.length > 0 ? summarise(errors) : null,
    failedByProvider: errors.length > 0 || skipped > 0 ? failures : null,
  });
  // A scan with no result keeps its due date, so the next scheduled run tries again.
  if (!allFailed) await setNextScanAt(job.businessId, nextScanAt(target.business.scanFrequency, ctx.now()));
  const released = await releaseHold(holdId);

  return {
    status: allFailed ? "failed" : "done",
    runId: run.id,
    checks: tasks.length,
    failed: errors.length,
    charged,
    released,
    skipped,
    errors,
    // Nothing worked because the AI tools were not answering (or Claude was left out): the worker does not retry it.
    outage: allFailed && notAnswering === errors.length,
  };
}

async function checkContext(target: ScanTargetRow, runId: string, overrides: Partial<ScanDeps>) {
  const { business, competitors, isTest } = target;
  let checkRunner = overrides.checkRunner ?? liveCheckRunner;
  let extractNames = overrides.extractNames !== undefined ? overrides.extractNames : liveNameExtractor();
  if (isTest) {
    // Test agencies never reach a live model, whatever was passed in (D-61).
    const recorded = recordedAnswers(await loadRecordedAnswers(overrides.recordedDir ?? RECORDED_ANSWERS_DIR), business.industry);
    checkRunner = recorded.runCheck;
    extractNames = recorded.extractNames;
  }

  const base: Omit<CheckContext, "runner"> = {
    runId,
    businessId: business.id,
    ownerUserId: business.ownerUserId,
    ...mentionTargets(business, competitors),
    location: locationOf(business),
    isTest,
    extractNames,
  };
  const runners = new Map(PROVIDERS.map((p) => [p, checkRunner(p)]));
  return {
    now: overrides.now ?? (() => new Date()),
    forProvider: (provider: ProviderId): CheckContext => ({ ...base, runner: runners.get(provider) ?? null }),
  };
}

export { scanCheckCount, withCity } from "./scan-tasks";

// On a 02:00 run far enough out that the next scan never reuses this one's cached answers (H1, schedule.ts).
export { nextScanAt };
