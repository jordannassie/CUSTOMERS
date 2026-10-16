"use server";

import { authFailure, getCurrentAgency, requireUser, type ActionResult } from "@/modules/auth";
import { canEditTracking } from "@/modules/entitlements";
import type { CompetitorCandidate } from "./competitor-places";
import { dedupeConfirmed } from "./competitors";
import { DUPLICATE_BUSINESS_TEXT, DuplicateBusinessError } from "./duplicates";
import { lookupCompetitor, runBusinessAutofill, saveBusinessPlace, saveCompetitors } from "./dal";
import { activeUser, autofillLimit, competitorLookupLimit } from "./guard";
import { websiteExists } from "./website/dal";
import { websiteNotFoundText } from "./website/domain-check";
import { autofillInput, competitorLookupInput, pickPlaceInput, saveCompetitorsInput, toDomain, type AutofillResult } from "./schema";

// Onboarding step 3 to 4 (MVP_SPEC 3.1, 3.2): fills the details form. Provider failures come back
// as an empty form with a note, never as an error. Paid for (AI and Places), so a suspended or deleted agency is
// refused and each user has an hourly limit.
export async function autofillBusiness(input: unknown): Promise<ActionResult<AutofillResult>> {
  let userId: string;
  try {
    userId = (await activeUser()).id;
  } catch (error) {
    return authFailure(error);
  }

  const parsed = autofillInput.safeParse(input);
  if (!parsed.success) return { ok: false, status: 400, error: "Enter your website, or your business name and city." };

  let request: { domain: string } | { name: string; city: string };
  if ("domain" in parsed.data) {
    const domain = toDomain(parsed.data.domain);
    if (!domain) return { ok: false, status: 400, error: "Enter a website address like yourbusiness.com." };
    if (!(await websiteExists(domain))) return { ok: false, status: 422, error: websiteNotFoundText(domain), field: "website" };
    request = { domain };
  } else {
    request = { name: parsed.data.name, city: parsed.data.city };
  }

  const limited = await autofillLimit(userId);
  if (limited) return limited;
  let result: AutofillResult | null;
  try {
    result = await runBusinessAutofill(userId, parsed.data.businessId, request);
  } catch (error) {
    if (error instanceof DuplicateBusinessError) return { ok: false, status: 409, error: DUPLICATE_BUSINESS_TEXT };
    throw error;
  }
  if (!result) return { ok: false, status: 404, error: "Business not found." };
  return { ok: true, data: result };
}

// "Is one of these your business?" with no website (MVP_SPEC 3.3): the pick saves its place_id, "None of
// these" clears it. Only after this does the form get the listing's details.
export async function confirmBusinessPlace(input: unknown): Promise<ActionResult<null>> {
  let userId: string;
  try {
    userId = (await activeUser()).id;
  } catch (error) {
    return authFailure(error);
  }
  const parsed = pickPlaceInput.safeParse(input);
  if (!parsed.success) return { ok: false, status: 400, error: "Choose your business, or None of these." };
  const saved = await saveBusinessPlace(userId, parsed.data.businessId, parsed.data.placeId);
  if (saved === "duplicate") return { ok: false, status: 409, error: DUPLICATE_BUSINESS_TEXT };
  if (!saved) return { ok: false, status: 404, error: "Business not found." };
  return { ok: true, data: null };
}

// Onboarding step 5 (MVP_SPEC 3.1): "add by name" with an optional Places match near the business.
export async function lookupCompetitorByName(
  input: unknown,
): Promise<ActionResult<{ matches: CompetitorCandidate[]; note: string | null }>> {
  let userId: string;
  try {
    userId = (await activeUser()).id;
  } catch (error) {
    return authFailure(error);
  }
  const parsed = competitorLookupInput.safeParse(input);
  if (!parsed.success) return { ok: false, status: 400, error: "Type at least 2 letters of the business name." };

  const limited = await competitorLookupLimit(userId);
  if (limited) return limited;
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
  // Users still setting up have no agency yet; an ended plan is read-only (BUG-C).
  const agency = await getCurrentAgency();
  const edit = agency ? canEditTracking(agency) : null;
  if (edit && !edit.allowed) return { ok: false, status: 403, error: edit.reason };
  const parsed = saveCompetitorsInput.safeParse(input);
  if (!parsed.success) return { ok: false, status: 400, error: "Check the competitor names and try again." };

  const result = await saveCompetitors(userId, parsed.data.businessId, dedupeConfirmed(parsed.data.competitors));
  if (!result.ok) return result;
  return { ok: true, data: { count: result.count } };
}
