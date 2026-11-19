"use server";

import { after } from "next/server";
import { authFailure, requireAgency, type ActionResult } from "@/modules/auth";
import { REASONS, canStartScan, isTestAgency } from "@/modules/entitlements";
import { isAbandonedJob } from "@/lib/scan-job-staleness";
import { abandonStaleJobs } from "./abandoned/dal";
import { businessAgencyId, insertManualJob, lastDoneScanAt, latestJob, postToWorker, runWorkerInProcess, scanCost, workerTimeBudgetMs } from "./dal";
import { recentScanNeeded, scannedRecently, type StartScanResult } from "./recent-scan";
import { businessIdInput, startScanInput } from "./schema";
import { scanStatusView, type ScanStatus } from "./service";
import { runWorker } from "./worker";

const notFound: ActionResult<never> = { ok: false, status: 404, error: "Business not found." };

/** Auth, input and ownership checks shared by both actions. */
async function ownBusiness(input: unknown): Promise<ActionResult<{ agencyId: string; businessId: string }>> {
  let agencyId: string;
  try {
    agencyId = (await requireAgency()).agency.id;
  } catch (error) {
    return authFailure(error);
  }
  const parsed = businessIdInput.safeParse(input);
  if (!parsed.success) return notFound;
  const { businessId } = parsed.data;
  if ((await businessAgencyId(businessId)) !== agencyId) return notFound;
  return { ok: true, data: { agencyId, businessId } };
}

/**
 * Run scan (MVP_SPEC 6.4): queue a high-priority job and start the worker without waiting for the schedule.
 * A scan the credits do not fully cover is refused by canStartScan (D-54, 2026-11-16), and one within 20 hours of the
 * last scan is not queued until the user confirms with `confirmRecent` (2026-10-15).
 */
export async function startScan(input: unknown): Promise<StartScanResult> {
  const owned = await ownBusiness(input);
  if (!owned.ok) return owned;
  const { agencyId, businessId } = owned.data;
  const parsed = startScanInput.safeParse(input);
  if (!parsed.success) return { ok: false, status: 400, error: "We couldn't start the scan. Try again." };

  // A scan the worker abandoned holds the one-active-job slot: end it first (uncharged) so a new one can start.
  await abandonStaleJobs(businessId);
  const allowed = await canStartScan(agencyId, businessId);
  if (!allowed.allowed) {
    const status = allowed.reason === REASONS.scanAlreadyQueued ? 409 : 403;
    return { ok: false, status, error: await shownReason(allowed.reason, agencyId) };
  }
  const [cost, lastDone, isTest] = await Promise.all([scanCost(businessId), lastDoneScanAt(businessId), isTestAgency(agencyId)]);
  if (scannedRecently(lastDone) && !parsed.data.confirmRecent) return recentScanNeeded(cost, isTest);
  // Two clicks can both pass the check above; the one-active-job index lets only one insert through.
  if (!(await insertManualJob(agencyId, businessId))) {
    return { ok: false, status: 409, error: REASONS.scanAlreadyQueued };
  }

  await startWorker();
  return { ok: true, data: scanStatusView({ status: "queued", finishedAt: null }, allowed) };
}

/** Polled by the Run scan button while a scan is queued or running. */
export async function getScanStatus(input: unknown): Promise<ActionResult<ScanStatus>> {
  const owned = await ownBusiness(input);
  if (!owned.ok) return owned;
  const { agencyId, businessId } = owned.data;

  const job = await latestJob(businessId);
  // Local dev has no every-minute schedule, so a retry that falls due is started from here instead.
  if (job?.status === "queued" && new Date(job.runAfter) <= new Date() && runWorkerInProcess()) {
    after(() => runWorker(workerTimeBudgetMs()).then(() => undefined));
  }
  const scanning = (job?.status === "queued" || job?.status === "running") && !isAbandonedJob(job);
  const can = scanning ? { allowed: true, reason: "" } : await canStartScan(agencyId, businessId);
  const allowed = can.allowed ? can : { ...can, reason: await shownReason(can.reason, agencyId) };
  return { ok: true, data: scanStatusView(job, allowed) };
}

/** A test agency at 0 credits cannot buy a top-up (D-61): the screen says an admin adds them instead. */
async function shownReason(reason: string, agencyId: string): Promise<string> {
  return reason === REASONS.outOfCredits && (await isTestAgency(agencyId)) ? REASONS.testOutOfCredits : reason;
}

// A failed trigger is not the user's problem: the job stays queued and the every-minute schedule runs it.
async function startWorker(): Promise<void> {
  try {
    if (await postToWorker()) return;
  } catch (error) {
    console.error(`Run scan: could not start the worker: ${error instanceof Error ? error.message : error}`);
    return;
  }
  if (runWorkerInProcess()) return after(() => runWorker(workerTimeBudgetMs()).then(() => undefined));
  // Only the every-minute schedule can run the job now; without it the scan never starts (the screen says so).
  console.warn("Run scan: no worker to start. Set WORKER_URL and WORKER_SECRET (or WORKER_IN_PROCESS in local dev).");
}
