"use server";

import { refresh } from "next/cache";
import { authFailure, requireAdmin, type ActionResult } from "@/modules/auth";
import { logAdminAction } from "../dal";
import { enqueueScan } from "./dal";
import { restoreDeletedBusiness, type RestoreRefusal } from "./restore/dal";
import { restoreBusinessInput, runScanInput } from "./schema";

const REFUSED = {
  not_found: { status: 404, error: "Business not found." },
  no_agency: {
    status: 409,
    error: "This business has no agency, so there is no credit pool to scan from.",
  },
  deleted: { status: 409, error: "This business was deleted, so it can't be scanned." },
  agency_deleted: { status: 409, error: "This account was deleted. Restore it before running a scan." },
  already_active: {
    status: 409,
    error: "A scan is already queued or running for this business.",
  },
} as const;

/** "Run scan now" for support: queues a high-priority job and records who asked. */
export async function runScanNow(input: unknown): Promise<ActionResult<{ jobId: string }>> {
  try {
    await requireAdmin();
  } catch (error) {
    return authFailure(error);
  }

  const parsed = runScanInput.safeParse(input);
  if (!parsed.success) return { ok: false, status: 400, error: "Pick a business from the list." };

  const result = await enqueueScan(parsed.data.businessId);
  if (!result.ok) return { ok: false, ...REFUSED[result.reason] };

  await logAdminAction("business.run_scan", { type: "business", id: parsed.data.businessId }, { job_id: result.jobId });
  refresh();
  return { ok: true, data: { jobId: result.jobId } };
}

const NOT_RESTORED: Record<RestoreRefusal, { status: number; error: string }> = {
  not_found: { status: 404, error: "Business not found." },
  not_deleted: { status: 409, error: "This business is not deleted." },
  too_late: { status: 409, error: "The waiting period has passed, so this business can no longer be restored." },
  agency_deleted: { status: 409, error: "The whole account was deleted. Restore the account first." },
  duplicate: { status: 409, error: "Another business in this account has the same website or Google listing, or is still being set up. Delete that one first." },
};

/** Restore a deleted business within its waiting period (MVP_SPEC 23), with the reason in the audit log. */
export async function restoreBusiness(input: unknown): Promise<ActionResult<null>> {
  try {
    await requireAdmin();
  } catch (error) {
    return authFailure(error);
  }
  const parsed = restoreBusinessInput.safeParse(input);
  if (!parsed.success) return { ok: false, status: 400, error: "Give a reason of at least 3 characters." };

  const result = await restoreDeletedBusiness(parsed.data.businessId);
  if (!result.ok) return { ok: false, ...NOT_RESTORED[result.reason] };
  await logAdminAction("business.restore", { type: "business", id: parsed.data.businessId }, {
    reason: parsed.data.reason,
    deleted_at: result.deletedAt,
  });
  refresh();
  return { ok: true, data: null };
}
