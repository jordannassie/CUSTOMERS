"use server";

import { authFailure, requireUser, type ActionResult } from "@/modules/auth";
import { trackCompetitorByName } from "./dal";
import { trackCompetitorInput } from "./schema";

// "Also recommended by AI" (B-50): one click adds a business AI named to the competitor list.
export async function trackCompetitor(input: unknown): Promise<ActionResult<{ name: string }>> {
  let userId: string;
  try {
    userId = (await requireUser()).id;
  } catch (error) {
    return authFailure(error);
  }
  const parsed = trackCompetitorInput.safeParse(input);
  if (!parsed.success) return { ok: false, status: 400, error: "Check the business name and try again." };

  const result = await trackCompetitorByName(userId, parsed.data.businessId, parsed.data.name);
  if (!result.ok) return result;
  return { ok: true, data: { name: parsed.data.name } };
}
