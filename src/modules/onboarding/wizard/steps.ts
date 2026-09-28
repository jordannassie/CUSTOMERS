// The onboarding wizard's steps and resume rules (MVP_SPEC 3.1, D-14). Pure, so the pages, actions and
// tests share them. Numbers match businesses.onboarding_step.

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

export function isStepSlug(value: string): value is StepSlug {
  return WIZARD_STEPS.some((s) => s.slug === value);
}

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
  const step = Math.max(state.draft.step ?? 0, stepNumber("details"));
  return WIZARD_STEPS.find((s) => s.number === step)?.slug ?? "models";
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
