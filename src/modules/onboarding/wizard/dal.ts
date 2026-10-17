import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { canAddBusiness } from "@/modules/entitlements";
import type { AutofillClients, AutofillRequest } from "../autofill";
import { runBusinessAutofill } from "../dal";
import { DUPLICATE_BUSINESS_TEXT, DuplicateBusinessError, duplicateBusiness } from "../duplicates";
import { autofillDone, insertDraft, websiteTaken } from "./draft/dal";
import { restartIfAnotherBusiness } from "./restart/dal";
import type { AutofillResult } from "../schema";
import { needsCard, nextStepNumber, type PlanId, type StepSlug, type WizardState } from "./steps";

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
      .is("deleted_at", null)
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
  /** autofill is null when it already ran for this draft as it is: the details step refills from what is saved. */
  | { ok: true; businessId: string; autofill: AutofillResult | null }
  | { ok: false; status: 403 | 409; error: string };

/**
 * Step 3: reuses the agency's one draft business (no duplicates on return, a double submit or a second tab) or creates
 * it, then runs auto-fill when the draft is new or now another business. Only what the user typed is saved here;
 * auto-fill values come back to pre-fill the form (D-73).
 */
export async function startBusiness(
  userId: string,
  request: AutofillRequest,
  /** Left out in the app, so auto-fill builds live clients that charge usage to this business. */
  clients?: AutofillClients,
  /** Chosen on the new-business plan picker, for a business after the first; ignored for a returning draft. */
  plan: PlanId | null = null,
  /** The browser's key for this attempt (migration 067): sent twice, it finds the same draft. */
  createKey: string | null = null,
  /** "Try again" after the website and Google both failed: auto-fill runs once more for the same website. */
  retry = false,
): Promise<StartBusinessResult> {
  const supabase = await createClient();
  const agency = await supabase.from("agencies").select("id").eq("owner_user_id", userId).maybeSingle();
  if (agency.error) throw new Error(`Could not load agency: ${agency.error.message}`);
  if (!agency.data) return { ok: false, status: 409, error: "Add your agency name first." };
  const agencyId = agency.data.id;

  const typed =
    "domain" in request
      ? { domain: request.domain, has_website: true }
      : { domain: null, has_website: false, name: request.name, primary_city: request.city };
  const state = await loadWizardState(userId);
  let draft = state.draft;
  if (!draft) {
    const allowed = await canAddBusiness(agencyId);
    if (!allowed.allowed) return { ok: false, status: 403, error: allowed.reason };
    const created = await insertDraft({
      userId,
      agencyId,
      name: "domain" in request ? request.domain : request.name,
      domain: typed.domain,
      hasWebsite: typed.has_website,
      city: "city" in request ? request.city : null,
      step: nextStepNumber(null, "website"),
      plan,
      createKey,
    });
    if (created.kind === "duplicate") return { ok: false, status: 409, error: DUPLICATE_BUSINESS_TEXT };
    if (created.kind === "created") {
      if (state.hasFinishedBusiness) await keepActiveBusiness(userId);
      return withAutofill(userId, created.id, request, clients);
    }
    // This attempt, or another tab, made the draft a moment ago: carry on with that one.
    draft = (await loadWizardState(userId)).draft;
    if (!draft) return { ok: false, status: 409, error: DUPLICATE_BUSINESS_TEXT };
  }

  const businessId = draft.id;
  if (typed.domain && (await websiteTaken(agencyId, typed.domain, businessId))) return { ok: false, status: 409, error: DUPLICATE_BUSINESS_TEXT };
  // Another business clears the old one's details and Google listing and saves the new name and city. The same
  // business entered again (Back from the details step) keeps its confirmed name, city, listing and progress.
  const restarted = await restartIfAnotherBusiness(userId, businessId, request);
  const { error } = await createServiceClient()
    .from("businesses")
    .update({
      domain: typed.domain,
      has_website: typed.has_website,
      ...(restarted ? {} : { onboarding_step: nextStepNumber(draft.step, "website") }),
    })
    .eq("id", businessId)
    .eq("owner_user_id", userId)
    .eq("status", "onboarding");
  if (duplicateBusiness(error)) return { ok: false, status: 409, error: DUPLICATE_BUSINESS_TEXT };
  if (error) throw new Error(`Could not update business: ${error.message}`);
  // The same business sent again: no second AI or Firecrawl call for what auto-fill already found.
  if (!restarted && !retry && (await autofillDone(businessId))) return { ok: true, businessId, autofill: null };
  return withAutofill(userId, businessId, request, clients);
}

async function withAutofill(userId: string, businessId: string, request: AutofillRequest, clients?: AutofillClients): Promise<StartBusinessResult> {
  try {
    const autofill = await runBusinessAutofill(userId, businessId, request, clients);
    if (!autofill) throw new Error("The draft business vanished during auto-fill");
    return { ok: true, businessId, autofill };
  } catch (error) {
    // Google's listing for this website is another business's already (migration 067).
    if (error instanceof DuplicateBusinessError) return { ok: false, status: 409, error: DUPLICATE_BUSINESS_TEXT };
    throw error;
  }
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

/** The business's onboarding_step, null when unset, undefined when it is not the user's. */
export async function ownStep(userId: string, businessId: string): Promise<number | null | undefined> {
  return stepOf(userId, businessId, false);
}

/**
 * Like ownStep, but only for the user's draft (status "onboarding"). The wizard's saves use this: once setup finishes
 * the business is live, and its details, competitors, questions and checks change in the app, where an ended plan is
 * read-only. Setup's last save (the models step, or the card step's finish) is what moves it out of "onboarding".
 */
export async function ownDraftStep(userId: string, businessId: string): Promise<number | null | undefined> {
  return stepOf(userId, businessId, true);
}

async function stepOf(userId: string, businessId: string, draftOnly: boolean): Promise<number | null | undefined> {
  const supabase = await createClient();
  let query = supabase.from("businesses").select("onboarding_step").eq("id", businessId).eq("owner_user_id", userId);
  if (draftOnly) query = query.eq("status", "onboarding");
  const { data, error } = await query.maybeSingle();
  if (error) throw new Error(`Could not load business: ${error.message}`);
  return data ? data.onboarding_step : undefined;
}

/** True when the business is the user's draft, still being set up. */
export async function isOwnDraft(userId: string, businessId: string): Promise<boolean> {
  return (await ownDraftStep(userId, businessId)) !== undefined;
}

/** What the website step starts from when the user comes back to it: the draft as saved, with no Places call. */
export type WebsiteStepDefaults = { domain: string; hasWebsite: boolean; name: string; city: string };

export async function loadWebsiteStep(userId: string, businessId: string): Promise<WebsiteStepDefaults | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("businesses")
    .select("domain, has_website, name, primary_city")
    .eq("id", businessId)
    .eq("owner_user_id", userId)
    .eq("status", "onboarding")
    .maybeSingle();
  if (error) throw new Error(`Could not load business: ${error.message}`);
  if (!data) return null;
  const hasWebsite = data.has_website !== false;
  // With a website the name is the typed domain until the details step, so only a no-website draft offers it.
  return { domain: data.domain ?? "", hasWebsite, name: hasWebsite ? "" : data.name, city: hasWebsite ? "" : (data.primary_city ?? "") };
}

export async function advanceStep(userId: string, businessId: string, saved: StepSlug): Promise<boolean> {
  const current = await ownDraftStep(userId, businessId);
  if (current === undefined) return false;
  const { error } = await createServiceClient()
    .from("businesses")
    .update({ onboarding_step: nextStepNumber(current, saved) })
    .eq("id", businessId)
    .eq("owner_user_id", userId);
  if (error) throw new Error(`Could not save progress: ${error.message}`);
  return true;
}
