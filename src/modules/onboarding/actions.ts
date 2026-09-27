"use server";

import { authFailure, requireUser, type ActionResult } from "@/modules/auth";
import { runBusinessAutofill } from "./dal";
import { autofillInput, toDomain, type AutofillResult } from "./schema";

// Onboarding step 3 to 4 (MVP_SPEC 3.1, 3.2): fills the details form. Provider failures come back
// as an empty form with a note, never as an error.
export async function autofillBusiness(input: unknown): Promise<ActionResult<AutofillResult>> {
  let userId: string;
  try {
    userId = (await requireUser()).id;
  } catch (error) {
    return authFailure(error);
  }

  const parsed = autofillInput.safeParse(input);
  if (!parsed.success) return { ok: false, status: 400, error: "Enter your website, or your business name and city." };

  let request: { domain: string } | { name: string; city: string };
  if ("domain" in parsed.data) {
    const domain = toDomain(parsed.data.domain);
    if (!domain) return { ok: false, status: 400, error: "Enter a website address like yourbusiness.com." };
    request = { domain };
  } else {
    request = { name: parsed.data.name, city: parsed.data.city };
  }

  const result = await runBusinessAutofill(userId, parsed.data.businessId, request);
  if (!result) return { ok: false, status: 404, error: "Business not found." };
  return { ok: true, data: result };
}
