import "server-only";
import { getCurrentAgency, requireUser } from "@/modules/auth";
import { canAddBusiness } from "@/modules/entitlements";
import { previewSetupAddOn, type SetupAddOn, type TrialOffer } from "@/modules/billing";
import { awaitingTrialCredits, loadCardStep } from "./card/dal";
import { loadWebsiteStep, loadWizardState, type WebsiteStepDefaults, type WizardContext } from "./dal";
import { loadDetailsStep, type DetailsStep } from "./details/dal";
import { loadModelsStep, loadQuestionsStep, selectedPlan, type ModelsStep, type QuestionsStep } from "./questions/dal";

// For the wizard pages: each redirects to login (then back to `next`) when signed out.

export async function getWizardState(next: string): Promise<WizardContext> {
  const user = await requireUser({ next });
  return loadWizardState(user.id);
}

/** Why a new business cannot be added (trial limit), or null. */
export async function getAddBusinessBlock(next: string): Promise<string | null> {
  await requireUser({ next });
  const agency = await getCurrentAgency();
  if (!agency) return null;
  const allowed = await canAddBusiness(agency.id);
  return allowed.allowed ? null : allowed.reason;
}

/** What finishing setup adds to the agency's subscription (BUG-071), or null when nothing is added. */
export async function getSetupAddOn(businessId: string, next: string): Promise<SetupAddOn | null> {
  await requireUser({ next });
  const agency = await getCurrentAgency();
  return agency ? previewSetupAddOn(agency.id, businessId) : null;
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

export async function getModelsStep(businessId: string, next: string): Promise<ModelsStep | null> {
  const user = await requireUser({ next });
  return loadModelsStep(user.id, businessId, await selectedPlan(user.id));
}

export async function getCardStep(businessId: string, next: string): Promise<{ offer: TrialOffer | null; started: boolean } | null> {
  const user = await requireUser({ next });
  return loadCardStep(user, businessId);
}

/** Whether the first scan must wait for the trial credits to land (F-48). */
export async function getAwaitingTrialCredits(next: string): Promise<boolean> {
  const user = await requireUser({ next });
  return awaitingTrialCredits(user.id);
}
