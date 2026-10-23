"use server";

import { z } from "zod";
import { authFailure, requireAgency, type ActionResult } from "@/modules/auth";
import { agencyFixesState, type FixesState } from "./save/dal";

const input = z.object({ businessId: z.uuid() });

// Polled by "Working out your fixes" until the latest scan's fixes are saved; the page then refreshes.
export async function checkFixes(raw: unknown): Promise<ActionResult<FixesState>> {
  let agencyId: string;
  try {
    agencyId = (await requireAgency()).agency.id;
  } catch (error) {
    return authFailure(error);
  }
  const parsed = input.safeParse(raw);
  if (!parsed.success) return { ok: false, status: 400, error: "Business not found." };
  const state = await agencyFixesState(agencyId, parsed.data.businessId);
  if (!state) return { ok: false, status: 404, error: "Business not found." };
  return { ok: true, data: state };
}
