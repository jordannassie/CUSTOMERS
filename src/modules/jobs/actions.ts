"use server";

import { after } from "next/server";
import { authFailure, requireAgency, type ActionResult } from "@/modules/auth";
import { getBalance } from "@/modules/credits";
import { REASONS, canStartScan } from "@/modules/entitlements";
import { businessAgencyId, insertManualJob, latestJob, postToWorker, runWorkerInProcess, scanCost, workerTimeBudgetMs } from "./dal";
import { overdraftNeeded, scanCreditCheck, type StartScanResult } from "./overdraft";
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
 * A scan that costs more than the balance (D-54) is not queued until the user confirms with `confirmOverdraft`.
 */
export async function startScan(input: unknown): Promise<StartScanResult> {
  const owned = await ownBusiness(input);
  if (!owned.ok) return owned;
  const { agencyId, businessId } = owned.data;
  const parsed = startScanInput.safeParse(input);
  if (!parsed.success) return { ok: false, status: 400, error: "We couldn't start the scan. Try again." };

  const allowed = await canStartScan(agencyId, businessId);
  if (!allowed.allowed) {
    const status = allowed.reason === REASONS.scanAlreadyQueued ? 409 : 403;
    return { ok: false, status, error: allowed.reason };
  }
  const [balance, cost] = await Promise.all([getBalance(agencyId), scanCost(businessId)]);
  const credits = scanCreditCheck(balance.balance ?? 0, cost);
  if (credits.kind === "refuse") return { ok: false, status: 403, error: REASONS.outOfCredits };
  if (credits.kind === "warn" && !parsed.data.confirmOverdraft) return overdraftNeeded(credits);
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
  const scanning = job?.status === "queued" || job?.status === "running";
  const allowed = scanning ? { allowed: true, reason: "" } : await canStartScan(agencyId, businessId);
  return { ok: true, data: scanStatusView(job, allowed) };
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
