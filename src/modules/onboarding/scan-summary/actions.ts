"use server";

import { authFailure, requireAgency, type ActionResult } from "@/modules/auth";
import { businessOnly } from "../wizard/schema";
import { isAgencyBusiness, loadFirstScanProgress, loadFirstScanSummary } from "./dal";
import type { FirstScanSummary, ModelProgress } from "./service";

const notFound: ActionResult<never> = { ok: false, status: 404, error: "Business not found." };

async function ownBusiness(input: unknown): Promise<ActionResult<{ agencyId: string; businessId: string }>> {
  let agencyId: string;
  try {
    agencyId = (await requireAgency()).agency.id;
  } catch (error) {
    return authFailure(error);
  }
  const parsed = businessOnly.safeParse(input);
  if (!parsed.success) return notFound;
  const { businessId } = parsed.data;
  return (await isAgencyBusiness(agencyId, businessId)) ? { ok: true, data: { agencyId, businessId } } : notFound;
}

/** Polled by the first scan screen with the scan status (DB-010). */
export async function getFirstScanProgress(input: unknown): Promise<ActionResult<ModelProgress[]>> {
  const owned = await ownBusiness(input);
  if (!owned.ok) return owned;
  return { ok: true, data: await loadFirstScanProgress(owned.data.businessId) };
}

export async function getFirstScanSummary(input: unknown): Promise<ActionResult<FirstScanSummary>> {
  const owned = await ownBusiness(input);
  if (!owned.ok) return owned;
  const summary = await loadFirstScanSummary(owned.data.agencyId, owned.data.businessId);
  return summary ? { ok: true, data: summary } : notFound;
}
