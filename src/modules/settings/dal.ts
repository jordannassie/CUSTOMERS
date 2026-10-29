import "server-only";
import { countryCode } from "@/lib/countries";
import { getCurrentAgency, requireAgency, requireUser, type GuardOptions } from "@/modules/auth";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { duplicateBusiness } from "@/modules/onboarding/server";
import { pickActiveBusiness } from "@/modules/workspace";
import { FREQUENCIES, MODEL_IDS, type Frequency, type ModelId } from "./schema";
import type { MatchedFields } from "./service";

const LOGO_BUCKET = "business-logos";
// A business with no subscription item yet gets the smallest plan, as in entitlements.
const FALLBACK_PLAN_ID = "starter";

export type SettingsBusiness = {
  id: string;
  name: string;
  industry: string;
  services: string[];
  /** Other names AI answers may use for the business, matched like its name (MVP_SPEC 5.5). */
  aliases: string[];
  city: string;
  region: string;
  /** ISO code, or "" when not set (BUG-086). */
  country: string;
  /** Neighborhood or area, "" when not set. */
  area: string;
  phone: string;
  website: string;
  models: ModelId[];
  frequency: Frequency;
};

export type SettingsView = {
  email: string | null;
  /** Null until onboarding creates the agency. */
  agency: { name: string; logoUrl: string | null } | null;
  business: SettingsBusiness | null;
  activeQuestions: number;
  plan: { name: string; monthlyCredits: number | null } | null;
};

export async function getSettings(options: GuardOptions = {}): Promise<SettingsView> {
  const user = await requireUser(options);
  const agency = await getCurrentAgency();
  const empty = { email: user.email, agency: null, business: null, activeQuestions: 0, plan: null };
  if (!agency) return empty;

  const supabase = await createClient();
  const [agencyRow, businesses, profile] = await Promise.all([
    supabase.from("agencies").select("name, logo_url").eq("id", agency.id).single(),
    supabase
      .from("businesses")
      .select("id, status, name, industry, services, aliases, primary_city, primary_region, primary_country, primary_area, phone, domain, models, scan_frequency")
      .eq("agency_id", agency.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
    supabase.from("profiles").select("active_business_id").eq("id", user.id).maybeSingle(),
  ]);
  if (agencyRow.error) throw new Error(`Could not load agency: ${agencyRow.error.message}`);
  if (businesses.error) throw new Error(`Could not load businesses: ${businesses.error.message}`);

  const view = { ...empty, agency: { name: agencyRow.data.name, logoUrl: agencyRow.data.logo_url } };
  // Same pick as the business switcher: the saved choice, else the newest set-up business, a draft only when alone.
  const row = pickActiveBusiness(businesses.data, profile.data?.active_business_id);
  if (!row) return view;

  const [questions, subscription] = await Promise.all([
    supabase.from("tracked_prompts").select("id", { count: "exact", head: true }).eq("business_id", row.id).eq("active", true),
    supabase.from("business_subscriptions").select("plan_id").eq("business_id", row.id).maybeSingle(),
  ]);
  if (questions.error) throw new Error(`Could not count questions: ${questions.error.message}`);
  if (subscription.error) throw new Error(`Could not load plan: ${subscription.error.message}`);
  const plan = await supabase
    .from("plans")
    .select("name, monthly_credits")
    .eq("id", subscription.data?.plan_id ?? FALLBACK_PLAN_ID)
    .maybeSingle();
  if (plan.error) throw new Error(`Could not load plan: ${plan.error.message}`);

  return {
    ...view,
    business: {
      id: row.id,
      name: row.name,
      industry: row.industry ?? "",
      services: row.services,
      aliases: row.aliases ?? [],
      city: row.primary_city ?? "",
      region: row.primary_region ?? "",
      country: countryCode(row.primary_country),
      area: row.primary_area ?? "",
      phone: row.phone ?? "",
      website: row.domain ?? "",
      models: row.models.filter((m): m is ModelId => (MODEL_IDS as readonly string[]).includes(m)),
      frequency: (FREQUENCIES as readonly string[]).includes(row.scan_frequency) ? (row.scan_frequency as Frequency) : "weekly",
    },
    activeQuestions: questions.count ?? 0,
    plan: plan.data && { name: plan.data.name, monthlyCredits: plan.data.monthly_credits },
  };
}

export type ProfileUpdate = {
  name: string;
  industry: string | null;
  services: string[];
  aliases?: string[];
  primary_city: string | null;
  primary_region: string | null;
  primary_country?: string | null;
  primary_area?: string | null;
  phone: string | null;
  domain: string | null;
  /** Kept in step with the website: mention rules are stricter without one (D-08). */
  has_website: boolean;
};

/** What a profile save may change that the questions or the matching of saved answers depend on. */
export type SavedProfile = MatchedFields & { industry: string | null; region: string | null };

/** The business's saved industry and matching fields, or undefined when it is not in the user's agency. */
export async function businessBefore(businessId: string): Promise<SavedProfile | undefined> {
  const { agency } = await requireAgency();
  const { data, error } = await createServiceClient()
    .from("businesses")
    .select("industry, name, aliases, domain, phone, primary_city, primary_region, primary_area")
    .eq("id", businessId)
    .eq("agency_id", agency.id)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw new Error(`Could not load the business: ${error.message}`);
  if (!data) return undefined;
  return {
    industry: data.industry,
    name: data.name,
    aliases: data.aliases,
    domain: data.domain,
    phone: data.phone,
    city: data.primary_city,
    region: data.primary_region,
    area: data.primary_area,
  };
}

/**
 * The website changed: what was read from the old one no longer describes the business. Its site facts are deleted,
 * so the scan worker reads the new site (MVP_SPEC 7.1). With a new website, the Google listing and chain flag found
 * through the old one are cleared too, so the listing is looked up again by the new domain (BUG-158). With no website
 * left, the listing stays: nothing could find it again. Only for a business in the user's agency.
 */
export async function forgetOldWebsite(businessId: string, newDomain: string | null): Promise<void> {
  const { agency } = await requireAgency();
  const db = createServiceClient();
  const { data, error } = await db
    .from("businesses")
    .select("id")
    .eq("id", businessId)
    .eq("agency_id", agency.id)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw new Error(`Could not load the business: ${error.message}`);
  if (!data) return;
  if (newDomain) {
    const { error: listingError } = await db
      .from("businesses")
      .update({ places_id: null, is_chain: false })
      .eq("id", businessId)
      .eq("agency_id", agency.id)
      .is("deleted_at", null);
    if (listingError) throw new Error(`Could not clear the old website's listing: ${listingError.message}`);
  }
  const { error: factsError } = await db.from("business_site_facts").delete().eq("business_id", businessId);
  if (factsError) throw new Error(`Could not clear the old website's facts: ${factsError.message}`);
}

/**
 * False when the business is not in the user's agency; "duplicate" when another business in it already has this
 * website (migration 067).
 */
export async function updateBusinessProfile(businessId: string, update: ProfileUpdate): Promise<boolean | "duplicate"> {
  return updateBusiness(businessId, update, "save the business profile");
}

export async function updateScanSettings(businessId: string, models: ModelId[], frequency: Frequency): Promise<boolean> {
  return (await updateBusiness(businessId, { models, scan_frequency: frequency }, "save the scan settings")) === true;
}

async function updateBusiness(
  businessId: string,
  update: ProfileUpdate | { models: ModelId[]; scan_frequency: Frequency },
  what: string,
): Promise<boolean | "duplicate"> {
  const { agency } = await requireAgency();
  const { data, error } = await createServiceClient()
    .from("businesses")
    .update({ ...update, updated_at: new Date().toISOString() })
    .eq("id", businessId)
    .eq("agency_id", agency.id)
    // The service client skips the policy that hides deleted businesses, so a deleted one is refused here.
    .is("deleted_at", null)
    .select("id")
    .maybeSingle();
  if (duplicateBusiness(error)) return "duplicate";
  if (error) throw new Error(`Could not ${what}: ${error.message}`);
  return !!data;
}

// Agencies have no update policy for signed-in users, so these write with the service client
// after requireAgency() has matched the row to the current user.
export async function updateAgencyName(name: string): Promise<void> {
  const { agency } = await requireAgency();
  const { error } = await createServiceClient().from("agencies").update({ name }).eq("id", agency.id);
  if (error) throw new Error(`Could not rename agency: ${error.message}`);
}

/** Replaces the agency logo and returns its public URL. The caller has checked the file with checkLogo. */
export async function saveAgencyLogo(file: ArrayBuffer, contentType: string): Promise<string> {
  const { agency } = await requireAgency();
  const db = createServiceClient();
  const path = `agencies/${agency.id}/logo`;
  const { error: uploadError } = await db.storage.from(LOGO_BUCKET).upload(path, file, { contentType, upsert: true });
  if (uploadError) throw new Error(`Could not upload logo: ${uploadError.message}`);

  // The path never changes, so the version stops browsers showing the old logo.
  const url = `${db.storage.from(LOGO_BUCKET).getPublicUrl(path).data.publicUrl}?v=${Date.now()}`;
  const { error } = await db.from("agencies").update({ logo_url: url }).eq("id", agency.id);
  if (error) throw new Error(`Could not save logo: ${error.message}`);
  return url;
}
