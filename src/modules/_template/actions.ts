"use server";

import { authFailure, requireAgency, type ActionResult } from "@/modules/auth";
import { updateBusinessName } from "./dal";
import { renameBusinessInput } from "./schema";
import { cleanBusinessName } from "./service";

// Server Actions are public POST endpoints: check auth first, then validate, then call the DAL.
export async function renameBusiness(input: unknown): Promise<ActionResult<{ name: string }>> {
  try {
    await requireAgency();
  } catch (error) {
    return authFailure(error);
  }

  const parsed = renameBusinessInput.safeParse(input);
  if (!parsed.success) return { ok: false, status: 400, error: "Check the business name and try again." };

  const name = cleanBusinessName(parsed.data.name);
  if (!name) return { ok: false, status: 400, error: "Enter a business name up to 120 characters." };

  const updated = await updateBusinessName(parsed.data.businessId, name);
  if (!updated) return { ok: false, status: 404, error: "Business not found." };
  return { ok: true, data: updated };
}
