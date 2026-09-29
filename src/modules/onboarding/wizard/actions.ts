"use server";

import { headers } from "next/headers";
import { env } from "@/lib/env";
import { authFailure, requireUser, type ActionResult } from "@/modules/auth";
import { sendWelcomeEmail } from "@/modules/notifications";
import { dedupeConfirmed } from "../competitors";
import { saveCompetitors } from "../dal";
import { saveCompetitorsInput, toDomain, type AutofillResult } from "../schema";
import { advanceStep, saveAgency, saveDetails, startBusiness } from "./dal";
import { finishCardStep, startCardCheckout } from "./card/dal";
import { finishWizard, saveModels, saveQuestions } from "./questions/dal";
import { agencyStepInput, businessOnly, detailsStepInput, modelsStepInput, questionsStepInput, websiteStepInput } from "./schema";
import { FIRST_SCAN_PATH, stepPath } from "./steps";
import { loadWizardState } from "./dal";

// Every onboarding step saves through one of these (MVP_SPEC 3.1). Each checks the session itself.

async function signedIn(): Promise<{ id: string; email: string | null } | ActionResult<never>> {
  try {
    return await requireUser();
  } catch (error) {
    return authFailure(error);
  }
}

async function userId(): Promise<string | ActionResult<never>> {
  const user = await signedIn();
  return "id" in user ? user.id : user;
}

const notFound = { ok: false, status: 404, error: "Business not found." } as const;

export async function saveAgencyStep(input: unknown): Promise<ActionResult<null>> {
  const user = await signedIn();
  if (!("id" in user)) return user;
  const parsed = agencyStepInput.safeParse(input);
  if (!parsed.success) return { ok: false, status: 400, error: "Enter your agency name, up to 120 characters." };
  const { agencyId } = await saveAgency(user.id, parsed.data.name, parsed.data.plan);
  // Renaming the agency later saves through here too; the welcome email's key keeps it to one. Never throws.
  if (user.email) await sendWelcomeEmail({ to: user.email, agencyId });
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

/** Goes on to the card step when the agency still needs one, else the business is set up now. */
export async function saveModelsStep(input: unknown): Promise<ActionResult<{ next: string }>> {
  const user = await userId();
  if (typeof user !== "string") return user;
  const parsed = modelsStepInput.safeParse(input);
  if (!parsed.success) return { ok: false, status: 400, error: "Pick at least one AI model and how often to check." };
  const { businessId, models, frequency } = parsed.data;
  if ((await loadWizardState(user)).needsCard) {
    if (!(await saveModels(user, businessId, models, frequency))) return notFound;
    return { ok: true, data: { next: stepPath("card") } };
  }
  if (!(await finishWizard(user, businessId, { models, frequency }))) return notFound;
  return { ok: true, data: { next: FIRST_SCAN_PATH } };
}

/** Step 8: the Checkout Session the card form runs on (B-41). */
export async function startCardStep(input: unknown): Promise<ActionResult<{ clientSecret: string }>> {
  const user = await signedIn();
  if (!("id" in user)) return user;
  const parsed = businessOnly.safeParse(input);
  if (!parsed.success) return notFound;
  const returnUrl = `${await appOrigin()}${stepPath("card")}?session_id={CHECKOUT_SESSION_ID}`;
  const result = await startCardCheckout(user, parsed.data.businessId, returnUrl);
  return result.ok ? { ok: true, data: { clientSecret: result.clientSecret } } : result;
}

/** Polled while "Setting up your account" shows: done once the webhook has linked the subscription. */
export async function checkCardStep(input: unknown): Promise<ActionResult<{ done: boolean; next: string }>> {
  const user = await userId();
  if (typeof user !== "string") return user;
  const parsed = businessOnly.safeParse(input);
  if (!parsed.success) return notFound;
  const done = await finishCardStep(user, parsed.data.businessId);
  if (done === null) return notFound;
  return { ok: true, data: { done, next: FIRST_SCAN_PATH } };
}

async function appOrigin(): Promise<string> {
  if (env.NEXT_PUBLIC_APP_URL) return env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
