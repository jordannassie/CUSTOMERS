"use server";

import { refresh } from "next/cache";
import { authFailure, requireAdmin, type ActionResult } from "@/modules/auth";
import { retryFailedJob } from "@/modules/jobs";
import { auditedChange, changed, unchanged } from "../dal";
import { retryScanInput } from "./schema";

const REFUSED = {
  not_failed: { status: 409, error: "This scan did not fail or skip, or has already been retried, so there is nothing to retry." },
  business_busy: { status: 409, error: "This business already has a scan waiting or running." },
  business_deleted: { status: 409, error: "This business was deleted, so its scan can't be retried." },
} as const;

/**
 * "Retry" on a failed scan: the worker picks it up again on its next run. The history row is written before the retry
 * (BUG-278) and ends as failed when there was nothing to retry.
 */
export async function retryScan(input: unknown): Promise<ActionResult<{ jobId: string }>> {
  try {
    await requireAdmin();
  } catch (error) {
    return authFailure(error);
  }

  const parsed = retryScanInput.safeParse(input);
  if (!parsed.success) return { ok: false, status: 400, error: "Pick a scan from the list." };

  const { jobId } = parsed.data;
  try {
    const result = await auditedChange<ActionResult<{ jobId: string }>>(
      "scan_job.retry",
      { type: "scan_job", id: jobId },
      {},
      async () => {
        const outcome = await retryFailedJob(jobId);
        if (outcome !== "queued") return unchanged({ ok: false, ...REFUSED[outcome] }, outcome);
        return changed({ ok: true, data: { jobId } });
      },
    );
    if (result.ok) refresh();
    return result;
  } catch (error) {
    return authFailure(error);
  }
}
