"use server";

import { refresh } from "next/cache";
import { authFailure, requireUser, type ActionResult } from "@/modules/auth";
import { loadSwitcherScores, setActiveBusiness } from "./dal";
import type { SwitcherScores } from "./scores";
import { switchBusinessInput } from "./schema";

/** Each business's score and weekly change for the switcher, asked for when it opens (DB-011). */
export async function switcherScores(): Promise<ActionResult<SwitcherScores | null>> {
  try {
    return { ok: true, data: await loadSwitcherScores() };
  } catch (error) {
    return authFailure(error);
  }
}

// Refreshes the app frame (the switcher, the sidebar) for the other business; the switcher then opens its Overview.
export async function switchBusiness(input: unknown): Promise<ActionResult<null>> {
  try {
    await requireUser();
  } catch (error) {
    return authFailure(error);
  }

  const parsed = switchBusinessInput.safeParse(input);
  if (!parsed.success) return { ok: false, status: 400, error: "Pick a business from the list." };

  if (!(await setActiveBusiness(parsed.data.businessId))) {
    return { ok: false, status: 404, error: "Business not found." };
  }
  refresh();
  return { ok: true, data: null };
}
