"use server";

import { refresh } from "next/cache";
import { authFailure, requireAgency, type ActionResult } from "@/modules/auth";
import { saveAgencyLogo, updateAgencyName, updateBusinessProfile, updateScanSettings } from "./dal";
import { agencyNameInput, businessProfileInput, scanSettingsInput } from "./schema";
import { checkLogo, normalizeWebsite } from "./service";

type Result<T = null> = ActionResult<T>;

async function guard(): Promise<ActionResult<never> | null> {
  try {
    await requireAgency();
    return null;
  } catch (error) {
    return authFailure(error);
  }
}

const notFound: Result = { ok: false, status: 404, error: "Business not found." };

export async function saveBusinessProfile(input: unknown): Promise<Result> {
  const denied = await guard();
  if (denied) return denied;

  const parsed = businessProfileInput.safeParse(input);
  if (!parsed.success) return { ok: false, status: 400, error: "Check the highlighted details and try again." };
  const { businessId, name, industry, services, city, region, phone, website } = parsed.data;
  const site = normalizeWebsite(website);
  if (!site.ok) return { ok: false, status: 400, error: "Enter a website like yourbusiness.com, or leave it empty." };

  const saved = await updateBusinessProfile(businessId, {
    name,
    industry: industry || null,
    services,
    primary_city: city || null,
    primary_region: region || null,
    phone: phone || null,
    domain: site.domain,
  });
  if (!saved) return notFound;
  refresh();
  return { ok: true, data: null };
}

export async function saveScanSettings(input: unknown): Promise<Result> {
  const denied = await guard();
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
