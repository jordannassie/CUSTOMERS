"use server";

import { refresh } from "next/cache";
import { after } from "next/server";
import { OTHER_LABEL_HINT } from "@/lib/other-label";
import { authFailure, getCurrentAgency, type ActionResult } from "@/modules/auth";
import { addBusinessAtSetup } from "@/modules/billing";
import { canFinishDraft } from "@/modules/entitlements";
import { sendWelcomeEmail } from "@/modules/notifications";
import { dedupeConfirmed } from "../competitors";
import { saveCompetitors } from "../dal";
import { activeUser, autofillLimit } from "../guard";
import { websiteExists } from "../website/dal";
import { websiteNotFoundText } from "../website/domain-check";
import { saveCompetitorsInput, toDomain, type AutofillResult } from "../schema";
import { advanceStep, isOwnDraft, saveAgency, startBusiness } from "./dal";
import { saveDetails } from "./details/dal";
import { awaitingTrialCredits, cardReturnUrl, finishCardStep, startCardCheckout } from "./card/dal";
import { saveDraftPlan } from "./plan/dal";
import { finishWizard, saveModels, saveQuestions } from "./questions/dal";
import { warmFirstQuestions } from "./questions/first-set/dal";
import {
  agencyStepInput,
  businessOnly,
  detailsStepInput,
  modelsStepInput,
  questionsStepInput,
  setupPlanInput,
  websiteStepInput,
} from "./schema";
import { FIRST_SCAN_PATH, stepPath } from "./steps";
import { hasFinishedBusiness, loadWizardState } from "./dal";

// Every onboarding step saves through one of these (MVP_SPEC 3.1). Each checks the session itself, and refuses a
// suspended or deleted agency. The step saves change only the user's draft: a live business is edited in the app.

async function signedIn(): Promise<{ id: string; email: string | null } | ActionResult<never>> {
  try {
    return await activeUser();
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

export async function saveWebsiteStep(input: unknown): Promise<ActionResult<{ businessId: string; autofill: AutofillResult | null }>> {
  const user = await userId();
  if (typeof user !== "string") return user;
  const parsed = websiteStepInput.safeParse(input);
  if (!parsed.success) return { ok: false, status: 400, error: "Enter your website, or your business name and city." };
  const { plan, createKey, retry } = parsed.data;

  let request: { domain: string } | { name: string; city: string };
  if ("domain" in parsed.data) {
    const domain = toDomain(parsed.data.domain);
    if (!domain) return { ok: false, status: 400, error: "Enter a website address like yourbusiness.com." };
    if (!(await websiteExists(domain))) return { ok: false, status: 422, error: websiteNotFoundText(domain), field: "website" };
    request = { domain };
  } else {
    const { name, city } = parsed.data;
    request = { name, city };
  }
  // The limit is charged inside startBusiness, only when auto-fill will run: Back and Continue with the same business
  // reuses what auto-fill found and used to spend one of the hour's lookups each time.
  const gate = async () => {
    const limited = await autofillLimit(user);
    return limited && !limited.ok ? limited : null;
  };
  const result = await startBusiness(user, request, undefined, plan ?? null, createKey ?? null, retry === true && "domain" in request, gate);
  if (!result.ok) return result;
  return { ok: true, data: { businessId: result.businessId, autofill: result.autofill } };
}

export async function saveDetailsStep(input: unknown): Promise<ActionResult<null>> {
  const user = await userId();
  if (typeof user !== "string") return user;
  const parsed = detailsStepInput.safeParse(input);
  if (!parsed.success) {
    // A vague "Other" label gets the same hint the field shows, not the generic message (2026-10-16).
    const vague = parsed.error.issues.some((i) => i.message === OTHER_LABEL_HINT);
    return { ok: false, status: 400, error: vague ? OTHER_LABEL_HINT : "Add your business name, industry and city." };
  }
  const [saved, finished] = await Promise.all([saveDetails(user, parsed.data), hasFinishedBusiness(user)]);
  if (!saved) return notFound;
  // The suggested questions take about 15 seconds to make: they start now, while the user picks competitors, so the
  // questions step usually only reads them (first-set/dal.ts, 2026-10-29).
  inBackground(() => warmFirstQuestions(user, parsed.data.businessId), "Starting the first questions");
  // The switcher names the draft by the name just saved, not its website (O2). It only shows during setup when the
  // user already has a set-up business; otherwise the refresh re-rendered the step being left, for nothing (2026-10-23).
  if (finished) refresh();
  return { ok: true, data: null };
}

/** Runs after the response is sent. Outside a request (tests, scripts) nothing starts: the step that needs it makes it. */
function inBackground(task: () => Promise<unknown>, what: string): void {
  try {
    after(() => task().catch((error) => console.warn(`${what} failed: ${error instanceof Error ? error.message : String(error)}`)));
  } catch {
    // after() throws outside a request scope.
  }
}

// The competitor picker's save, plus moving the wizard on.
export async function saveCompetitorsStep(input: unknown): Promise<ActionResult<{ count: number }>> {
  const user = await userId();
  if (typeof user !== "string") return user;
  const parsed = saveCompetitorsInput.safeParse(input);
  if (!parsed.success) return { ok: false, status: 400, error: "Check the competitor names and try again." };

  if (!(await isOwnDraft(user, parsed.data.businessId))) return notFound;
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
  const { businessId, models, frequency, addOn } = parsed.data;
  if (!(await isOwnDraft(user, businessId))) return notFound;
  if ((await loadWizardState(user)).needsCard) {
    if (!(await saveModels(user, businessId, models, frequency))) return notFound;
    return { ok: true, data: { next: stepPath("card") } };
  }
  // BUG-071: a business added after the first joins the subscription before it starts scanning.
  const agency = await getCurrentAgency();
  if (agency) {
    // D-16: drafts never count toward the trial's limit, so this is where a third set-up business is refused.
    const allowed = await canFinishDraft(agency.id);
    if (!allowed.allowed) return { ok: false, status: 403, error: allowed.reason };
    const added = await addBusinessAtSetup(agency.id, businessId, addOn ?? null);
    if (!added.ok) return added;
  }
  if (!(await finishWizard(user, businessId, { models, frequency }))) return notFound;
  return { ok: true, data: { next: FIRST_SCAN_PATH } };
}

/**
 * The plan for the business being set up, picked on the last step (BUG-244). Nothing is charged here: finishing setup
 * adds the business to the subscription on this plan, at the price the step shows (D-57), or the card step starts
 * the trial on it.
 */
export async function chooseSetupPlan(input: unknown): Promise<ActionResult<{ planId: string }>> {
  const user = await userId();
  if (typeof user !== "string") return user;
  const parsed = setupPlanInput.safeParse(input);
  if (!parsed.success) return { ok: false, status: 400, error: "Pick a plan and try again." };
  const { businessId, planId } = parsed.data;
  const saved = await saveDraftPlan(user, businessId, planId);
  return saved.ok ? { ok: true, data: { planId } } : saved;
}

/** Step 8: the Checkout Session the card form runs on (B-41). */
export async function startCardStep(input: unknown): Promise<ActionResult<{ clientSecret: string }>> {
  const user = await signedIn();
  if (!("id" in user)) return user;
  const parsed = businessOnly.safeParse(input);
  if (!parsed.success) return notFound;
  const result = await startCardCheckout(user, parsed.data.businessId, cardReturnUrl());
  return result.ok ? { ok: true, data: { clientSecret: result.clientSecret } } : result;
}

/** Polled while "Setting up your account" shows: done once the webhook has linked the subscription. */
export async function checkCardStep(input: unknown): Promise<ActionResult<{ done: boolean; next: string }>> {
  const user = await signedIn();
  if (!("id" in user)) return user;
  const parsed = businessOnly.safeParse(input);
  if (!parsed.success) return notFound;
  const done = await finishCardStep(user, parsed.data.businessId);
  if (done === null) return notFound;
  return { ok: true, data: { done, next: FIRST_SCAN_PATH } };
}

/** Polled by the first scan screen while the trial credits are on their way (F-48). */
export async function checkTrialCredits(): Promise<ActionResult<{ waiting: boolean }>> {
  const user = await userId();
  if (typeof user !== "string") return user;
  return { ok: true, data: { waiting: await awaitingTrialCredits(user) } };
}
