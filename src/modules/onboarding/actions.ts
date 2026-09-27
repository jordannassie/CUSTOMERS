"use server";

import { authFailure, requireUser, type ActionResult } from "@/modules/auth";
import type { CompetitorCandidate } from "./competitor-places";
import { dedupeConfirmed } from "./competitors";
import { lookupCompetitor, runBusinessAutofill, saveCompetitors } from "./dal";
import { autofillInput, competitorLookupInput, saveCompetitorsInput, toDomain, type AutofillResult } from "./schema";

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

// Onboarding step 5 (MVP_SPEC 3.1): "add by name" with an optional Places match near the business.
export async function lookupCompetitorByName(
  input: unknown,
): Promise<ActionResult<{ matches: CompetitorCandidate[]; note: string | null }>> {
  let userId: string;
  try {
    userId = (await requireUser()).id;
  } catch (error) {
    return authFailure(error);
  }
  const parsed = competitorLookupInput.safeParse(input);
  if (!parsed.success) return { ok: false, status: 400, error: "Type at least 2 letters of the business name." };

  const result = await lookupCompetitor(userId, parsed.data.businessId, parsed.data.name);
  if (!result) return { ok: false, status: 404, error: "Business not found." };
  return { ok: true, data: result };
}

// Saves the ticked and added competitors: the user's names and place ids only (D-73).
export async function saveCompetitorList(input: unknown): Promise<ActionResult<{ count: number }>> {
  let userId: string;
  try {
    userId = (await requireUser()).id;
  } catch (error) {
    return authFailure(error);
  }
  const parsed = saveCompetitorsInput.safeParse(input);
  if (!parsed.success) return { ok: false, status: 400, error: "Check the competitor names and try again." };

  const result = await saveCompetitors(userId, parsed.data.businessId, dedupeConfirmed(parsed.data.competitors));
  if (!result.ok) return result;
  return { ok: true, data: { count: result.count } };
}
