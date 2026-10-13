"use server";

import { refresh } from "next/cache";
import { authFailure, requireAgency, type ActionResult } from "@/modules/auth";
import { canEditTracking } from "@/modules/entitlements";
import { saveCompetitorAliases as saveAliases } from "./aliases/dal";
import { trackCompetitorByName } from "./dal";
import { competitorAliasesInput, trackCompetitorInput } from "./schema";

// "Also recommended by AI" (B-50): one click adds a business AI named to the competitor list.
export async function trackCompetitor(input: unknown): Promise<ActionResult<{ name: string }>> {
  let userId: string;
  try {
    const { user, agency } = await requireAgency();
    const edit = canEditTracking(agency);
    if (!edit.allowed) return { ok: false, status: 403, error: edit.reason };
    userId = user.id;
  } catch (error) {
    return authFailure(error);
  }
  const parsed = trackCompetitorInput.safeParse(input);
  if (!parsed.success) return { ok: false, status: 400, error: "Check the business name and try again." };

  const result = await trackCompetitorByName(userId, parsed.data.businessId, parsed.data.name);
  if (!result.ok) return result;
  return { ok: true, data: { name: parsed.data.name } };
}

// Manage competitors: other names AI may use for each one ("KFC"), so those answers count for it.
export async function saveCompetitorAliases(input: unknown): Promise<ActionResult<{ changed: number }>> {
  let agencyId: string;
  try {
    const { agency } = await requireAgency();
    const edit = canEditTracking(agency);
    if (!edit.allowed) return { ok: false, status: 403, error: edit.reason };
    agencyId = agency.id;
  } catch (error) {
    return authFailure(error);
  }
  const parsed = competitorAliasesInput.safeParse(input);
  if (!parsed.success) return { ok: false, status: 400, error: "Check the other names: up to 10 for each, each at least 2 characters." };

  const result = await saveAliases(agencyId, parsed.data.businessId, parsed.data.competitors);
  if (!result.ok) return result;
  refresh();
  return { ok: true, data: { changed: result.changed } };
}
