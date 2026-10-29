"use server";

import { refresh } from "next/cache";
import { authFailure, requireAgency, type ActionResult } from "@/modules/auth";
import { canEditTracking } from "@/modules/entitlements";
import { saveCompetitorAliases as saveAliases } from "./aliases/dal";
import { trackCompetitorByName } from "./dal";
import { checkWebsiteInput, competitorAliasesInput, competitorWebsiteInput, trackCompetitorInput } from "./schema";
import { checkWebsite } from "./site/dal";
import { websiteDomain } from "./service";
import { saveCompetitorWebsite as saveWebsite } from "./website/dal";

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

// "Add website" on Side by side on Google: the user's own entry for a competitor Google lists no website for.
export async function saveCompetitorWebsite(input: unknown): Promise<ActionResult<{ domain: string | null }>> {
  let agencyId: string;
  try {
    const { agency } = await requireAgency();
    const edit = canEditTracking(agency);
    if (!edit.allowed) return { ok: false, status: 403, error: edit.reason };
    agencyId = agency.id;
  } catch (error) {
    return authFailure(error);
  }
  const parsed = competitorWebsiteInput.safeParse(input);
  if (!parsed.success) return { ok: false, status: 400, error: "Enter a website like burningbrownie.com." };
  const domain = parsed.data.website ? websiteDomain(parsed.data.website) : null;
  if (parsed.data.website && !domain) return { ok: false, status: 400, error: "Enter a website like burningbrownie.com." };

  const result = await saveWebsite(agencyId, parsed.data.businessId, parsed.data.competitorId, domain);
  if (!result.ok) return result;
  refresh();
  return { ok: true, data: { domain: result.domain } };
}

// "Check their website" in the See why panel and on Opportunities (B-91): reads a competitor's site once, for everyone.
export async function checkCompetitorWebsite(
  input: unknown,
): Promise<ActionResult<{ status: "read" | "blocked" | "unreachable" | "reading"; reused: boolean }>> {
  let ids: { user: { id: string }; agency: { id: string; isTest: boolean } };
  try {
    const { user, agency } = await requireAgency();
    const edit = canEditTracking(agency);
    if (!edit.allowed) return { ok: false, status: 403, error: edit.reason };
    ids = { user: { id: user.id }, agency: { id: agency.id, isTest: agency.isTest } };
  } catch (error) {
    return authFailure(error);
  }
  const parsed = checkWebsiteInput.safeParse(input);
  if (!parsed.success) return { ok: false, status: 400, error: "Add their website first." };

  const result = await checkWebsite(ids.user, ids.agency, parsed.data);
  if (!result.ok) return result;
  refresh();
  return { ok: true, data: { status: result.status, reused: result.reused } };
}
