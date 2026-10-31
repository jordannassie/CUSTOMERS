"use server";

import { countryCode } from "@/lib/countries";
import { OTHER_LABEL_HINT } from "@/lib/other-label";
import { refresh } from "next/cache";
import { authFailure, requireAgency, type ActionResult } from "@/modules/auth";
import { canEditTracking } from "@/modules/entitlements";
import {
  DUPLICATE_BUSINESS_TEXT,
  keepCompetitorsNear,
  questionBasisChanged,
  rebuildQuestionsForIndustry,
  savedLocation,
} from "@/modules/onboarding/server";
import { recountAfterNamesChange } from "@/modules/scanning";
import { businessBefore, forgetOldWebsite, saveAgencyLogo, updateAgencyName, updateBusinessProfile, updateScanSettings } from "./dal";
import { agencyNameInput, businessProfileInput, scanSettingsInput } from "./schema";
import { checkLogo, matchingChanged, normalizeWebsite, profileFieldError, refusesOtherLabel, websiteChanged } from "./service";

type Result<T = null> = ActionResult<T>;

async function guard(): Promise<ActionResult<never> | null> {
  try {
    await requireAgency();
    return null;
  } catch (error) {
    return authFailure(error);
  }
}

/** For changes to what the scans track; the agency name and logo stay editable. */
async function trackingGuard(): Promise<ActionResult<never> | null> {
  try {
    const edit = canEditTracking((await requireAgency()).agency);
    return edit.allowed ? null : { ok: false, status: 403, error: edit.reason };
  } catch (error) {
    return authFailure(error);
  }
}

const notFound: Result = { ok: false, status: 404, error: "Business not found." };

export async function saveBusinessProfile(input: unknown): Promise<Result> {
  const denied = await trackingGuard();
  if (denied) return denied;

  const parsed = businessProfileInput.safeParse(input);
  if (!parsed.success) {
    // Named, so the form marks that field: "Check the highlighted details" with nothing highlighted helped no one.
    const field = profileFieldError(parsed.error.issues);
    return field ? { ok: false, status: 400, ...field } : { ok: false, status: 400, error: "Check the details and try again." };
  }
  const { businessId, name, industry, services, aliases, city, region, country, area, phone, website } = parsed.data;
  const site = normalizeWebsite(website);
  if (!site.ok) return { ok: false, status: 400, error: "Enter a website like yourbusiness.com, or leave it empty.", field: "website" };

  const before = await businessBefore(businessId);
  if (before === undefined) return notFound;
  const location = await savedLocation(businessId);
  // A new "Other" label must say what the business does; one saved before this rule can stay while other fields
  // change (2026-10-16).
  if (refusesOtherLabel(before.industry, industry)) return { ok: false, status: 400, error: OTHER_LABEL_HINT, field: "industry" };
  const saved = await updateBusinessProfile(businessId, {
    name,
    industry: industry || null,
    services,
    ...(aliases === undefined ? {} : { aliases }),
    primary_city: city || null,
    primary_region: region || null,
    // Left as it is when the form did not send one; an unknown value clears it (BUG-086).
    ...(country === undefined ? {} : { primary_country: countryCode(country) || null }),
    ...(area === undefined ? {} : { primary_area: area }),
    phone: phone || null,
    domain: site.domain,
    has_website: site.domain !== null,
  });
  if (saved === "duplicate") return { ok: false, status: 409, error: DUPLICATE_BUSINESS_TEXT };
  if (!saved) return notFound;
  // Another website: the old site's facts, and the Google listing found through it, are read again for the new one.
  if (websiteChanged(before.domain, site.domain)) await forgetOldWebsite(businessId, site.domain);
  // A new city, region or country: competitors picked from Google for the old place go, and Manage competitors says so.
  const { removed } = await keepCompetitorsNear(businessId, location, { recount: false });
  // A new industry, city, region or area gets questions for it; the user's own questions and past results stay.
  const basis = { industry: industry || null, city: city || null, region: region || null, area: area === undefined ? before.area : area };
  if (questionBasisChanged({ industry: before.industry, city: before.city, region: before.region, area: before.area }, basis)) {
    await rebuildQuestionsForIndustry(businessId);
  }
  // Saved answers are checked again for the new names, website, phone, city or area, so the score counts "KFC" or the
  // new website from today, not from the next scan.
  const after = {
    name,
    aliases: aliases ?? before.aliases,
    domain: site.domain,
    phone: phone || null,
    city: city || null,
    area: area === undefined ? before.area : area,
  };
  if (removed || matchingChanged(before, after)) await recountAfterNamesChange(businessId);
  refresh();
  return { ok: true, data: null };
}

export async function saveScanSettings(input: unknown): Promise<Result> {
  const denied = await trackingGuard();
  if (denied) return denied;

  const parsed = scanSettingsInput.safeParse(input);
  if (!parsed.success) return { ok: false, status: 400, error: "Pick at least one AI model and how often to check." };

  const { businessId, models, frequency } = parsed.data;
  if (!(await updateScanSettings(businessId, models, frequency))) return notFound;
  refresh();
  return { ok: true, data: null };
}

export async function saveAgencyName(input: unknown): Promise<Result> {
  const denied = await guard();
  if (denied) return denied;

  const parsed = agencyNameInput.safeParse(input);
  if (!parsed.success) return { ok: false, status: 400, error: "Enter an agency name up to 120 characters." };

  await updateAgencyName(parsed.data.name);
  refresh();
  return { ok: true, data: null };
}

export async function uploadAgencyLogo(form: FormData): Promise<Result<{ logoUrl: string }>> {
  const denied = await guard();
  if (denied) return denied;

  const file = form.get("logo");
  if (!(file instanceof File)) return { ok: false, status: 400, error: "Choose an image to upload." };
  const bytes = await file.arrayBuffer();
  const checked = checkLogo(bytes.byteLength, new Uint8Array(bytes, 0, Math.min(12, bytes.byteLength)));
  if (!checked.ok) return { ok: false, status: 400, error: checked.error };

  const logoUrl = await saveAgencyLogo(bytes, checked.contentType);
  refresh();
  return { ok: true, data: { logoUrl } };
}
