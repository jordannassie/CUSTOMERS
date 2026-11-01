import "server-only";
import { cache } from "react";
import { getCurrentAgency, requireUser } from "@/modules/auth";
import { canAddBusiness, canFinishDraft } from "@/modules/entitlements";
import { PlanChangeError, previewSetupAddOn, type SetupAddOn } from "@/modules/billing";
import { awaitingTrialCredits, loadCardStep, type CardStep } from "./card/dal";
import { loadWebsiteStep, loadWizardState, type WebsiteStepDefaults, type WizardContext } from "./dal";
import { loadDetailsStep, type DetailsStep } from "./details/dal";
import { draftPlanId, loadSetupPlans, type SetupPlanOption } from "./plan/dal";
import { loadModelsStep, loadQuestionsStep, type ModelsStep, type QuestionsStep } from "./questions/dal";
import type { PlanId } from "./steps";

// For the wizard pages: each redirects to login (then back to `next`) when signed out.

export async function getWizardState(next: string): Promise<WizardContext> {
  const user = await requireUser({ next });
  return loadWizardState(user.id);
}

/** Why a new business cannot be started (trial limit, set-up businesses only), or null. */
export async function getAddBusinessBlock(next: string): Promise<string | null> {
  await requireUser({ next });
  const agency = await getCurrentAgency();
  if (!agency) return null;
  const allowed = await canAddBusiness(agency.id);
  return allowed.allowed ? null : allowed.reason;
}

/** Why the draft cannot be finished yet (a trial with 2 set-up businesses already, D-16), or null. */
export async function getFinishBlock(next: string): Promise<string | null> {
  await requireUser({ next });
  const agency = await getCurrentAgency();
  if (!agency) return null;
  const allowed = await canFinishDraft(agency.id);
  return allowed.allowed ? null : allowed.reason;
}

/** The price could not be checked: the models step still loads, says why, and waits for Try again (BUG-252). */
export type SetupAddOnUnavailable = { unavailable: string };

export const ADD_ON_UNAVAILABLE = "We couldn't check the price of adding this business. Nothing was charged. Try again in a minute.";

/** What finishing setup adds to the agency's subscription (BUG-071), or null when nothing is added. */
export async function getSetupAddOn(businessId: string, next: string): Promise<SetupAddOn | SetupAddOnUnavailable | null> {
  await requireUser({ next });
  const agency = await getCurrentAgency();
  if (!agency) return null;
  try {
    return await previewSetupAddOn(agency.id, businessId);
  } catch (error) {
    // A Stripe refusal or a plan-change rule used to blank the whole step ("This step didn't load"), BUG-252.
    if (error instanceof PlanChangeError) return { unavailable: error.message };
    const e = error as { type?: string; code?: string; statusCode?: number; message?: string };
    console.error("[onboarding/models] setup add-on preview failed", { agencyId: agency.id, businessId, type: e?.type, code: e?.code, statusCode: e?.statusCode, message: e?.message });
    return { unavailable: ADD_ON_UNAVAILABLE };
  }
}

/** The draft's saved website, or name and city, so going Back to the website step shows what was entered. */
export async function getWebsiteStep(businessId: string, next: string): Promise<WebsiteStepDefaults | null> {
  const user = await requireUser({ next });
  return loadWebsiteStep(user.id, businessId);
}

export async function getDetailsStep(businessId: string, next: string): Promise<DetailsStep | null> {
  const user = await requireUser({ next });
  return loadDetailsStep(user.id, businessId);
}

export async function getQuestionsStep(businessId: string, next: string): Promise<QuestionsStep | null | "no-city"> {
  const user = await requireUser({ next });
  return loadQuestionsStep(user.id, businessId);
}

// The models step asks for the draft's plan twice (its credits and the plan picker): read once per page (2026-10-29).
const pagePlanId = cache(draftPlanId);

export async function getModelsStep(businessId: string, next: string): Promise<ModelsStep | null> {
  const user = await requireUser({ next });
  // Not awaited here: the plan is read alongside the business.
  return loadModelsStep(user.id, businessId, pagePlanId(user.id, businessId));
}

/** The plans the draft can be set up on and the one it is on now (BUG-244). */
export async function getSetupPlans(businessId: string, next: string): Promise<{ plans: SetupPlanOption[]; planId: PlanId }> {
  const user = await requireUser({ next });
  const [plans, planId] = await Promise.all([loadSetupPlans(), pagePlanId(user.id, businessId)]);
  return { plans, planId };
}

/** `withSession`: the card form will show, so its Checkout Session is made with the page (loadCardStep). */
export async function getCardStep(businessId: string, next: string, options: { withSession?: boolean } = {}): Promise<CardStep | null> {
  const user = await requireUser({ next });
  return loadCardStep(user, businessId, options);
}

/** Whether the first scan must wait for the trial credits to land (F-48). */
export async function getAwaitingTrialCredits(next: string): Promise<boolean> {
  const user = await requireUser({ next });
  return awaitingTrialCredits(user.id);
}
