import "server-only";
import { getCurrentAgency, requireUser } from "@/modules/auth";
import { canAddBusiness } from "@/modules/entitlements";
import { loadDetailsStep, loadWizardState, type DetailsStep, type WizardContext } from "./dal";
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
