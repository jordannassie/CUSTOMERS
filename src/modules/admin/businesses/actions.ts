"use server";

import { refresh } from "next/cache";
import { authFailure, requireAdmin, type ActionResult } from "@/modules/auth";
import { logAdminAction } from "../dal";
import { enqueueScan } from "./dal";
import { runScanInput } from "./schema";

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
