"use server";

import { after } from "next/server";
import { authFailure, requireAgency, type ActionResult } from "@/modules/auth";
import { REASONS, canStartScan } from "@/modules/entitlements";
import { businessAgencyId, insertManualJob, latestJob, postToWorker, runWorkerInProcess, workerTimeBudgetMs } from "./dal";
import { businessIdInput } from "./schema";
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

/** Run scan (MVP_SPEC 6.4): queue a high-priority job and start the worker without waiting for the schedule. */
export async function startScan(input: unknown): Promise<ActionResult<ScanStatus>> {
  const owned = await ownBusiness(input);
  if (!owned.ok) return owned;
  const { agencyId, businessId } = owned.data;

  const allowed = await canStartScan(agencyId, businessId);
  if (!allowed.allowed) {
    const status = allowed.reason === REASONS.scanAlreadyQueued ? 409 : 403;
    return { ok: false, status, error: allowed.reason };
  }
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
  if (runWorkerInProcess()) after(() => runWorker(workerTimeBudgetMs()).then(() => undefined));
}
