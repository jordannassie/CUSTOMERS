"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { authFailure, requireAgency, type ActionResult } from "@/modules/auth";
import { canEditTracking } from "@/modules/entitlements";
import { checkRateLimit } from "@/modules/rate-limit";
import { DUPLICATE_BUSINESS_TEXT } from "../duplicates";
import { placeIdPattern } from "../schema";
import { findBranches, saveBranch } from "./dal";
import type { BranchSearch } from "./service";

const searchInput = z.object({ businessId: z.uuid(), query: z.string().trim().min(2).max(120) });
const pickInput = z.object({ businessId: z.uuid(), placeId: z.string().regex(placeIdPattern) });

const BRANCH_SEARCH_LIMITED = "You've searched Google for your branch a lot this hour. Try again later.";
const SEARCH_DOWN = "We couldn't search Google just now. Try again in a few minutes.";
const ALREADY_PICKED = "Your branch is already saved. Reload the page to see it.";

// "Pick your branch on Google" (step 6d): a new search typed by the user. Each one is a paid Places Text Search, so
// it has a per-user hourly limit (SEC-07). An ended plan is read-only, so it searches nothing (MVP_SPEC 4.4).
export async function searchBranches(input: unknown): Promise<ActionResult<BranchSearch>> {
  let ids: { agencyId: string; userId: string };
  try {
    const { agency, user } = await requireAgency();
    const edit = canEditTracking(agency);
    if (!edit.allowed) return { ok: false, status: 403, error: edit.reason };
    ids = { agencyId: agency.id, userId: user.id };
  } catch (error) {
    return authFailure(error);
  }
  const parsed = searchInput.safeParse(input);
  if (!parsed.success) return { ok: false, status: 400, error: "Type your branch's name and area, at least 2 letters." };
  const limit = await checkRateLimit("branch_search", ids.userId);
  if (limit === "limited") return { ok: false, status: 429, error: BRANCH_SEARCH_LIMITED };
  if (limit === "unavailable") return { ok: false, status: 503, error: SEARCH_DOWN };
  const found = await findBranches(ids.agencyId, parsed.data.businessId, parsed.data.query);
  if (!found) return { ok: false, status: 404, error: "Business not found." };
  // "No branch found" is saved and the claim step joins the checklist, so the page reads it again (no Google call).
  if (!found.unavailable) refresh();
  return { ok: true, data: found };
}

// The owner's pick: only its place_id is saved (D-73), then the page shows the branch's Google details.
export async function pickBranch(input: unknown): Promise<ActionResult<null>> {
  let agencyId: string;
  try {
    const { agency } = await requireAgency();
    const edit = canEditTracking(agency);
    if (!edit.allowed) return { ok: false, status: 403, error: edit.reason };
    agencyId = agency.id;
  } catch (error) {
    return authFailure(error);
  }
  const parsed = pickInput.safeParse(input);
  if (!parsed.success) return { ok: false, status: 400, error: "Choose your branch from the list." };
  const saved = await saveBranch(agencyId, parsed.data.businessId, parsed.data.placeId);
  if (saved === "not_found") return { ok: false, status: 404, error: "Business not found." };
  if (saved === "not_needed") return { ok: false, status: 409, error: ALREADY_PICKED };
  // Another business in this account already uses that listing (migration 067).
  if (saved === "duplicate") return { ok: false, status: 409, error: DUPLICATE_BUSINESS_TEXT };
  refresh();
  return { ok: true, data: null };
}
