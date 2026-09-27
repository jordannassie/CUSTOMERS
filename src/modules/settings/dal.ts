import "server-only";
import { getCurrentAgency, requireAgency, requireUser, type GuardOptions } from "@/modules/auth";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { FREQUENCIES, MODEL_IDS, type Frequency, type ModelId } from "./schema";

const LOGO_BUCKET = "business-logos";
// A business with no subscription item yet gets the smallest plan, as in entitlements.
const FALLBACK_PLAN_ID = "starter";

export type SettingsBusiness = {
  id: string;
  name: string;
  industry: string;
  services: string[];
  city: string;
  region: string;
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
      .select("id, name, industry, services, primary_city, primary_region, phone, domain, models, scan_frequency")
      .eq("agency_id", agency.id)
      .order("created_at", { ascending: false }),
    supabase.from("profiles").select("active_business_id").eq("id", user.id).maybeSingle(),
  ]);
  if (agencyRow.error) throw new Error(`Could not load agency: ${agencyRow.error.message}`);
  if (businesses.error) throw new Error(`Could not load businesses: ${businesses.error.message}`);

  const view = { ...empty, agency: { name: agencyRow.data.name, logoUrl: agencyRow.data.logo_url } };
  // Same pick as the business switcher: the saved choice, else the newest.
  const row = businesses.data.find((b) => b.id === profile.data?.active_business_id) ?? businesses.data[0];
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
      city: row.primary_city ?? "",
      region: row.primary_region ?? "",
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
  primary_city: string | null;
  primary_region: string | null;
  phone: string | null;
  domain: string | null;
};

/** False when the business is not in the user's agency. */
export async function updateBusinessProfile(businessId: string, update: ProfileUpdate): Promise<boolean> {
  return updateBusiness(businessId, update, "save the business profile");
}

export async function updateScanSettings(businessId: string, models: ModelId[], frequency: Frequency): Promise<boolean> {
  return updateBusiness(businessId, { models, scan_frequency: frequency }, "save the scan settings");
}

async function updateBusiness(
  businessId: string,
  update: ProfileUpdate | { models: ModelId[]; scan_frequency: Frequency },
  what: string,
): Promise<boolean> {
  const { agency } = await requireAgency();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("businesses")
    .update({ ...update, updated_at: new Date().toISOString() })
    .eq("id", businessId)
    .eq("agency_id", agency.id)
    .select("id")
    .maybeSingle();
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
