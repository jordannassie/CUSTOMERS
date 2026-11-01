"use server";

import { authFailure, requireAgency, type ActionResult } from "@/modules/auth";
import { updateMyEmailPreferences } from "./dal";
import { emailPreferencesInput, type EmailPreferences } from "./schema";

export async function saveEmailPreferences(input: unknown): Promise<ActionResult<EmailPreferences>> {
  try {
    await requireAgency();
  } catch (error) {
    return authFailure(error);
  }

  const parsed = emailPreferencesInput.safeParse(input);
  if (!parsed.success) return { ok: false, status: 400, error: "Check your email settings and try again." };

  await updateMyEmailPreferences(parsed.data);
  return { ok: true, data: parsed.data };
}
