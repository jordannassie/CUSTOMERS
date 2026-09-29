import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { canAddBusiness } from "@/modules/entitlements";
import type { AutofillClients, AutofillRequest } from "../autofill";
import { liveAutofillClients, runBusinessAutofill } from "../dal";
import { isIndustry } from "@/lib/industries";
import type { AutofillResult, BusinessDetails } from "../schema";
import { needsCard, nextStepNumber, type PlanId, type StepSlug, type WizardState } from "./steps";
import type { DetailsStepInput } from "./schema";

export type WizardContext = WizardState & { agencyName: string | null; agencyLogoUrl: string | null };

// Drafts are matched on owner_user_id, like the workspace, so the wizard and the app frame agree.
export async function loadWizardState(userId: string): Promise<WizardContext> {
  const supabase = await createClient();
  const [agency, drafts, finished] = await Promise.all([
    supabase.from("agencies").select("name, logo_url, is_test, stripe_subscription_id").eq("owner_user_id", userId).maybeSingle(),
    supabase
      .from("businesses")
      .select("id, onboarding_step")
      .eq("owner_user_id", userId)
      .eq("status", "onboarding")
      .order("created_at", { ascending: false })
      .limit(1),
    supabase.from("businesses").select("id", { count: "exact", head: true }).eq("owner_user_id", userId).neq("status", "onboarding"),
  ]);
  if (agency.error) throw new Error(`Could not load agency: ${agency.error.message}`);
  if (drafts.error) throw new Error(`Could not load businesses: ${drafts.error.message}`);
  if (finished.error) throw new Error(`Could not load businesses: ${finished.error.message}`);
  const draft = drafts.data[0];
  const hasFinishedBusiness = (finished.count ?? 0) > 0;
  const a = agency.data;
  return {
    hasAgency: agency.data !== null,
    agencyName: agency.data?.name ?? null,
    agencyLogoUrl: agency.data?.logo_url ?? null,
    draft: draft ? { id: draft.id, step: draft.onboarding_step } : null,
    hasFinishedBusiness,
    needsCard: needsCard({ isTest: a?.is_test ?? false, hasSubscription: Boolean(a?.stripe_subscription_id) }, hasFinishedBusiness),
  };
}

/**
 * Step 2: creates the agency, or renames it when the user comes back. Agencies have no write policy
 * for signed-in users, so this uses the service role for the caller's own row only.
 */
export async function saveAgency(userId: string, name: string, plan: PlanId | null): Promise<{ agencyId: string }> {
  const service = createServiceClient();
  const { data, error } = await service
    .from("agencies")
    .upsert({ owner_user_id: userId, name }, { onConflict: "owner_user_id" })
    .select("id")
    .single();
  if (error) throw new Error(`Could not save agency: ${error.message}`);
  // agencies has no plan column yet, so the pricing page choice waits in app_metadata for the card step (B-41).
  if (plan) {
    const { error: planError } = await service.auth.admin.updateUserById(userId, { app_metadata: { selected_plan: plan } });
    if (planError) throw new Error(`Could not save the chosen plan: ${planError.message}`);
  }
  return { agencyId: data.id };
}

export type StartBusinessResult =
  | { ok: true; businessId: string; autofill: AutofillResult }
  | { ok: false; status: 403 | 409; error: string };

/**
 * Step 3: reuses the user's one draft business (no duplicates on return) or creates it, then runs auto-fill.
 * Only what the user typed is saved here; auto-fill values come back to pre-fill the form (D-73).
 */
export async function startBusiness(
  userId: string,
  request: AutofillRequest,
  clients: AutofillClients = liveAutofillClients(),
): Promise<StartBusinessResult> {
  const supabase = await createClient();
  const agency = await supabase.from("agencies").select("id").eq("owner_user_id", userId).maybeSingle();
  if (agency.error) throw new Error(`Could not load agency: ${agency.error.message}`);
  if (!agency.data) return { ok: false, status: 409, error: "Add your agency name first." };

  const typed =
    "domain" in request
      ? { domain: request.domain, has_website: true }
      : { domain: null, has_website: false, name: request.name, primary_city: request.city };
  const state = await loadWizardState(userId);
  let businessId: string;
  if (state.draft) {
    businessId = state.draft.id;
    // A new website means the old Places match may be wrong; auto-fill sets it again when it finds one.
    const { error } = await supabase
      .from("businesses")
      .update({ ...typed, places_id: null, onboarding_step: nextStepNumber(state.draft.step, "website") })
      .eq("id", businessId)
      .eq("owner_user_id", userId);
    if (error) throw new Error(`Could not update business: ${error.message}`);
  } else {
    const allowed = await canAddBusiness(agency.data.id);
    if (!allowed.allowed) return { ok: false, status: 403, error: allowed.reason };
    const { data, error } = await supabase
      .from("businesses")
      .insert({
        name: "domain" in request ? request.domain : request.name,
        ...typed,
        owner_user_id: userId,
        agency_id: agency.data.id,
        status: "onboarding",
        onboarding_step: nextStepNumber(null, "website"),
      })
      .select("id")
      .single();
    if (error) throw new Error(`Could not create business: ${error.message}`);
    businessId = data.id;
    if (state.hasFinishedBusiness) await keepActiveBusiness(userId);
  }

  const autofill = await runBusinessAutofill(userId, businessId, request, clients);
  if (!autofill) throw new Error("The draft business vanished during auto-fill");
  return { ok: true, businessId, autofill };
}

// With no active business saved, the app falls back to the newest one, which would now be the draft
// and hide the dashboard while a second business is set up. Pin the newest finished one instead.
async function keepActiveBusiness(userId: string): Promise<void> {
  const supabase = await createClient();
  const profile = await supabase.from("profiles").select("active_business_id").eq("id", userId).maybeSingle();
  if (profile.error) throw new Error(`Could not load profile: ${profile.error.message}`);
  if (profile.data?.active_business_id) return;
  const latest = await supabase
    .from("businesses")
    .select("id")
    .eq("owner_user_id", userId)
    .neq("status", "onboarding")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (latest.error) throw new Error(`Could not load businesses: ${latest.error.message}`);
  if (!latest.data) return;
  const { error } = await supabase.from("profiles").update({ active_business_id: latest.data.id }).eq("id", userId);
  if (error) throw new Error(`Could not save the active business: ${error.message}`);
}

export type DetailsStep = {
  businessId: string;
  domain: string | null;
  hasWebsite: boolean;
  /** Saved values once confirmed, else the business's own site facts; the screen adds the fresh auto-fill. */
  details: BusinessDetails;
  /** The user's own words for their trade when the industry is "other". */
  industryText: string;
  confirmed: boolean;
};

export async function loadDetailsStep(userId: string, businessId: string): Promise<DetailsStep | null> {
  const supabase = await createClient();
  const { data: b, error } = await supabase
    .from("businesses")
    .select("name, domain, has_website, industry, description, services, primary_city, primary_region, primary_country, phone, onboarding_step")
    .eq("id", businessId)
    .eq("owner_user_id", userId)
    .maybeSingle();
  if (error) throw new Error(`Could not load business: ${error.message}`);
  if (!b) return null;

  const confirmed = (b.onboarding_step ?? 0) > 4;
  const saved: BusinessDetails = {
    // Before confirming, the name is only the typed domain, so it is not offered as the name.
    name: confirmed || !b.has_website ? b.name : "",
    industry: (b.industry && isIndustry(b.industry) ? b.industry : b.industry ? "other" : "") as BusinessDetails["industry"],
    description: b.description ?? "",
    services: b.services,
    city: b.primary_city ?? "",
    state: b.primary_region ?? "",
    country: b.primary_country ?? "",
    phone: b.phone ?? "",
    address: "",
  };
  let details = saved;
  if (!confirmed && b.has_website) {
    const facts = await supabase.from("business_site_facts").select("data").eq("business_id", businessId).maybeSingle();
    const f = (facts.data?.data as { facts?: Partial<BusinessDetails> } | null)?.facts;
    if (f) {
      const found = Object.keys(saved).filter((k) => f[k as keyof BusinessDetails]).map((k) => [k, f[k as keyof BusinessDetails]]);
      details = { ...saved, ...Object.fromEntries(found) };
    }
  }
  const industryText = b.industry && !isIndustry(b.industry) ? b.industry : "";
  return { businessId, domain: b.domain, hasWebsite: b.has_website !== false, details, industryText, confirmed };
}

/** Step 4: saves what the user confirmed about their own business. False when it is not theirs. */
export async function saveDetails(userId: string, input: DetailsStepInput): Promise<boolean> {
  const current = await ownStep(userId, input.businessId);
  if (current === undefined) return false;
  const supabase = await createClient();
  const { error } = await supabase
    .from("businesses")
    .update({
      name: input.name,
      industry: input.industry,
      description: input.description || null,
      services: input.services,
      primary_city: input.city,
      primary_region: input.state || null,
      primary_country: input.country || null,
      phone: input.phone || null,
      onboarding_step: nextStepNumber(current, "details"),
    })
    .eq("id", input.businessId)
    .eq("owner_user_id", userId);
  if (error) throw new Error(`Could not save business details: ${error.message}`);
  return true;
}

/** The business's onboarding_step, null when unset, undefined when it is not the user's. */
export async function ownStep(userId: string, businessId: string): Promise<number | null | undefined> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("businesses")
    .select("onboarding_step")
    .eq("id", businessId)
    .eq("owner_user_id", userId)
    .maybeSingle();
  if (error) throw new Error(`Could not load business: ${error.message}`);
  return data ? data.onboarding_step : undefined;
}

export async function advanceStep(userId: string, businessId: string, saved: StepSlug): Promise<boolean> {
  const current = await ownStep(userId, businessId);
  if (current === undefined) return false;
  const supabase = await createClient();
  const { error } = await supabase
    .from("businesses")
    .update({ onboarding_step: nextStepNumber(current, saved) })
    .eq("id", businessId)
    .eq("owner_user_id", userId);
  if (error) throw new Error(`Could not save progress: ${error.message}`);
  return true;
}
