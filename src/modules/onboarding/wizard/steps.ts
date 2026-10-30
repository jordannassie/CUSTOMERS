// The onboarding wizard's steps and resume rules (MVP_SPEC 3.1, D-14). Pure, so the pages, actions and
// tests share them. Numbers match businesses.onboarding_step.
//
// What each Continue saves, and why Back then Continue (changed or not) never duplicates anything (2026-10-16):
// - agency (2): saveAgency upserts the one agency per owner; the welcome email has its own key.
// - website (3): startBusiness reuses the agency's one draft (migration 067 refuses a second, and the browser's
//   create key finds the same draft on a double submit). Same website, or name and city: no auto-fill again when it
//   already ran (autofillDone), so no extra AI cost. Another website: the draft starts over (restart/dal.ts). A website
//   another business in the agency has: "This business is already in your account".
// - details (4): an update of the draft. A new industry, services, city, region or area rebuilds the suggested
//   questions (the user's own stay) and sets questions_updated_at, which the questions step shows once.
// - competitors (5): saveCompetitors plans keep, add and remove by name, so the same list changes nothing; two saves at
//   once retry once on the unique name index. Questions are left alone.
// - questions (6): the first visit saves one set (save_first_questions locks the business); saving keeps unchanged
//   rows, adds and removes the rest, drops a question two saves added at once, and clears the notice.
// - models (7): saveModels updates the draft, or finishWizard (with addBusinessAtSetup, whose Stripe call has an
//   idempotency key) when no card follows.
// - card (8): one Checkout Session per visit; startCardCheckout refuses once the agency has a subscription, and
//   finishCardStep only finishes after the webhook (or the recovery from Stripe) linked it. Credits come from webhooks.
// Every step's Continue is disabled while it saves, and nextStepNumber never moves progress backwards, so a refresh
// returns to the same step with what was saved.

export const WIZARD_STEPS = [
  { slug: "agency", number: 2, label: "Your agency" },
  { slug: "website", number: 3, label: "Website" },
  { slug: "details", number: 4, label: "Business details" },
  { slug: "competitors", number: 5, label: "Competitors" },
  { slug: "questions", number: 6, label: "Questions" },
  { slug: "models", number: 7, label: "AI models" },
  { slug: "card", number: 8, label: "Start trial" },
] as const;

export type StepSlug = (typeof WIZARD_STEPS)[number]["slug"];

/** Step 8 is the card (B-41) and 9 the first scan (B-38): a business at 9 is set up and leaves the wizard. */
export const FINISHED_STEP = 9;

/** Where setup hands over once the business is set up (after the card step, or after models when no card is needed). */
export const FIRST_SCAN_PATH = "/onboarding/first-scan";

export const PLAN_IDS = ["starter", "pro"] as const;
export type PlanId = (typeof PLAN_IDS)[number];

export function stepNumber(slug: StepSlug): number {
  return WIZARD_STEPS.find((s) => s.slug === slug)!.number;
}

export function stepPath(slug: StepSlug): string {
  return `/onboarding/${slug}`;
}

export type WizardState = {
  hasAgency: boolean;
  /** The business being set up, if any. At most one draft per user, so a return never duplicates it. */
  draft: { id: string; step: number | null } | null;
  /** The user already has a set-up business, so this run adds another and skips the agency step. */
  hasFinishedBusiness: boolean;
  /** The agency still has to add a card: see needsCard(). */
  needsCard: boolean;
};

/**
 * The card step (MVP_SPEC 3.1 step 8) runs once per agency, on its first business. Test agencies skip it
 * (D-61), and so does an agency already linked to a Stripe subscription.
 */
export function needsCard(agency: { isTest: boolean; hasSubscription: boolean }, hasFinishedBusiness: boolean): boolean {
  return !agency.isTest && !agency.hasSubscription && !hasFinishedBusiness;
}

/** Where a returning user continues, or null when there is nothing left to set up. */
export function resumeStep(state: WizardState): StepSlug | null {
  if (!state.hasAgency) return "agency";
  if (!state.draft) return state.hasFinishedBusiness ? null : "website";
  return draftStep(state.draft.step);
}

/** The step a draft continues at: where it stopped, never before details (the website step made it). */
export function draftStep(onboardingStep: number | null): StepSlug {
  const step = Math.max(onboardingStep ?? 0, stepNumber("details"));
  return WIZARD_STEPS.find((s) => s.number === step)?.slug ?? "models";
}

/**
 * "Add a business" everywhere in the app links here: the agency's open draft continues where it stopped, and only with
 * no draft does a new one start on the website step. The trial limit counts set-up businesses only (D-16).
 */
export const ADD_BUSINESS_PATH = "/onboarding?add=1";

/** Where "Add a business" goes: the resume step, or the website step when nothing is being set up. */
export function addBusinessStep(state: WizardState): StepSlug {
  return resumeStep(state) ?? "website";
}

/** What the business switcher calls a draft: its name, else its website, else a stand-in (the name starts as the website). */
export function draftLabel(draft: { name: string | null; domain: string | null }): string {
  const name = draft.name?.trim() ?? "";
  const domain = draft.domain?.trim() ?? "";
  return `Finish setting up ${name && name !== domain ? name : domain || "your new business"}`;
}

/** A step can be opened when it is the resume step or one already passed; later steps redirect back. */
export function canOpen(slug: StepSlug, state: WizardState): boolean {
  if (slug === "agency") return true;
  if (!state.hasAgency) return false;
  if (slug === "website") return true;
  const resume = resumeStep(state);
  return state.draft !== null && resume !== null && stepNumber(slug) <= stepNumber(resume);
}

/** The steps shown in the progress bar: a second business runs the business steps only (MVP_SPEC 3.1). */
export function visibleSteps(state: WizardState) {
  const card = state.needsCard || (state.draft?.step ?? 0) >= stepNumber("card");
  return WIZARD_STEPS.filter((s) => !(s.slug === "agency" && state.hasFinishedBusiness) && !(s.slug === "card" && !card));
}

/** Saving a step never moves the user backwards when they return to edit an earlier one. */
export function nextStepNumber(current: number | null, saved: StepSlug): number {
  return Math.max(current ?? 0, stepNumber(saved) + 1);
}
