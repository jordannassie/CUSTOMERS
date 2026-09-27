"use server";

import { refresh } from "next/cache";
import { authFailure, requireAdmin, type ActionResult } from "@/modules/auth";
import { retryFailedJob } from "@/modules/jobs";
import { logAdminAction } from "../dal";
import { retryScanInput } from "./schema";

const REFUSED = {
  not_failed: { status: 409, error: "This scan is no longer failed, so there is nothing to retry." },
  business_busy: { status: 409, error: "This business already has a scan waiting or running." },
} as const;

/** "Retry" on a failed scan: the worker picks it up again on its next run, and the audit log records who asked. */
export async function retryScan(input: unknown): Promise<ActionResult<{ jobId: string }>> {
  try {
    await requireAdmin();
  } catch (error) {
    return authFailure(error);
  }

  const parsed = retryScanInput.safeParse(input);
  if (!parsed.success) return { ok: false, status: 400, error: "Pick a scan from the list." };

  const result = await retryFailedJob(parsed.data.jobId);
  if (result !== "queued") return { ok: false, ...REFUSED[result] };

  await logAdminAction("scan_job.retry", { type: "scan_job", id: parsed.data.jobId });
  refresh();
  return { ok: true, data: { jobId: parsed.data.jobId } };
}
