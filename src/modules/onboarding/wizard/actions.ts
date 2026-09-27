"use server";

import { authFailure, requireUser, type ActionResult } from "@/modules/auth";
import { dedupeConfirmed } from "../competitors";
import { saveCompetitors } from "../dal";
import { saveCompetitorsInput, toDomain, type AutofillResult } from "../schema";
import { advanceStep, saveAgency, saveDetails, startBusiness } from "./dal";
import { finishWizard, saveQuestions } from "./questions/dal";
import { agencyStepInput, detailsStepInput, modelsStepInput, questionsStepInput, websiteStepInput } from "./schema";

// Every onboarding step saves through one of these (MVP_SPEC 3.1). Each checks the session itself.

async function userId(): Promise<string | ActionResult<never>> {
  try {
    return (await requireUser()).id;
  } catch (error) {
    return authFailure(error);
  }
}

const notFound = { ok: false, status: 404, error: "Business not found." } as const;

export async function saveAgencyStep(input: unknown): Promise<ActionResult<null>> {
  const user = await userId();
  if (typeof user !== "string") return user;
  const parsed = agencyStepInput.safeParse(input);
  if (!parsed.success) return { ok: false, status: 400, error: "Enter your agency name, up to 120 characters." };
  await saveAgency(user, parsed.data.name, parsed.data.plan);
  return { ok: true, data: null };
}

export async function saveWebsiteStep(input: unknown): Promise<ActionResult<{ businessId: string; autofill: AutofillResult }>> {
  const user = await userId();
  if (typeof user !== "string") return user;
  const parsed = websiteStepInput.safeParse(input);
  if (!parsed.success) return { ok: false, status: 400, error: "Enter your website, or your business name and city." };

  let request: { domain: string } | { name: string; city: string };
  if ("domain" in parsed.data) {
    const domain = toDomain(parsed.data.domain);
    if (!domain) return { ok: false, status: 400, error: "Enter a website address like yourbusiness.com." };
    request = { domain };
  } else {
    request = parsed.data;
  }
  const result = await startBusiness(user, request);
  if (!result.ok) return result;
  return { ok: true, data: { businessId: result.businessId, autofill: result.autofill } };
}

export async function saveDetailsStep(input: unknown): Promise<ActionResult<null>> {
  const user = await userId();
  if (typeof user !== "string") return user;
  const parsed = detailsStepInput.safeParse(input);
  if (!parsed.success) return { ok: false, status: 400, error: "Add your business name, industry and city." };
  if (!(await saveDetails(user, parsed.data))) return notFound;
  return { ok: true, data: null };
}

// The competitor picker's save, plus moving the wizard on.
export async function saveCompetitorsStep(input: unknown): Promise<ActionResult<{ count: number }>> {
  const user = await userId();
  if (typeof user !== "string") return user;
  const parsed = saveCompetitorsInput.safeParse(input);
  if (!parsed.success) return { ok: false, status: 400, error: "Check the competitor names and try again." };

  const result = await saveCompetitors(user, parsed.data.businessId, dedupeConfirmed(parsed.data.competitors));
  if (!result.ok) return result;
  if (!(await advanceStep(user, parsed.data.businessId, "competitors"))) return notFound;
  return { ok: true, data: { count: result.count } };
}

export async function saveQuestionsStep(input: unknown): Promise<ActionResult<{ count: number }>> {
  const user = await userId();
  if (typeof user !== "string") return user;
  const parsed = questionsStepInput.safeParse(input);
  if (!parsed.success) return { ok: false, status: 400, error: "Keep at least one question, each at least 8 characters." };
  const result = await saveQuestions(user, parsed.data.businessId, parsed.data.questions);
  if (!result.ok) return result;
  return { ok: true, data: { count: result.count } };
}

export async function saveModelsStep(input: unknown): Promise<ActionResult<null>> {
  const user = await userId();
  if (typeof user !== "string") return user;
  const parsed = modelsStepInput.safeParse(input);
  if (!parsed.success) return { ok: false, status: 400, error: "Pick at least one AI model and how often to check." };
  const { businessId, models, frequency } = parsed.data;
  if (!(await finishWizard(user, businessId, models, frequency))) return notFound;
  return { ok: true, data: null };
}
