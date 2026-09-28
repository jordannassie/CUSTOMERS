// The onboarding wizard's steps and resume rules (MVP_SPEC 3.1, D-14). Pure, so the pages, actions and
// tests share them. Numbers match businesses.onboarding_step.

export const WIZARD_STEPS = [
  { slug: "agency", number: 2, label: "Your agency" },
  { slug: "website", number: 3, label: "Website" },
  { slug: "details", number: 4, label: "Business details" },
  { slug: "competitors", number: 5, label: "Competitors" },
  { slug: "questions", number: 6, label: "Questions" },
  { slug: "models", number: 7, label: "AI models" },
] as const;

export type StepSlug = (typeof WIZARD_STEPS)[number]["slug"];

/** Step 8 is the card (B-41) and 9 the first scan (B-38); until the card exists models leads to the first scan. */
export const FINISHED_STEP = 9;

/** Where setup hands over once the business is saved. The card step (B-41) goes before it. */
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
};

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
  return state.hasFinishedBusiness ? WIZARD_STEPS.filter((s) => s.slug !== "agency") : WIZARD_STEPS;
}

/** Saving a step never moves the user backwards when they return to edit an earlier one. */
export function nextStepNumber(current: number | null, saved: StepSlug): number {
  return Math.max(current ?? 0, stepNumber(saved) + 1);
}
