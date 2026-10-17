"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { authFailure, requireAgency, type ActionResult } from "@/modules/auth";
import { canEditTracking } from "@/modules/entitlements";
import { placeIdPattern } from "../schema";
import { findBranches, saveBranch } from "./dal";
import type { BranchSearch } from "./service";

const searchInput = z.object({ businessId: z.uuid(), query: z.string().trim().min(2).max(120) });
const pickInput = z.object({ businessId: z.uuid(), placeId: z.string().regex(placeIdPattern) });

// "Pick your branch on Google" (step 6d): a new search typed by the user.
export async function searchBranches(input: unknown): Promise<ActionResult<BranchSearch>> {
  let agencyId: string;
  try {
    agencyId = (await requireAgency()).agency.id;
  } catch (error) {
    return authFailure(error);
  }
  const parsed = searchInput.safeParse(input);
  if (!parsed.success) return { ok: false, status: 400, error: "Type your branch's name and area, at least 2 letters." };
  const found = await findBranches(agencyId, parsed.data.businessId, parsed.data.query);
  if (!found) return { ok: false, status: 404, error: "Business not found." };
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
  if (!(await saveBranch(agencyId, parsed.data.businessId, parsed.data.placeId))) return { ok: false, status: 404, error: "Business not found." };
  refresh();
  return { ok: true, data: null };
}
