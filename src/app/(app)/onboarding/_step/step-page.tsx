import { Suspense } from "react";
import { redirect } from "next/navigation";
import { WizardFrame, type FrameStep } from "@/components/onboarding/WizardFrame";
import { canOpen, getWizardState, resumeStep, stepPath, visibleSteps, type StepSlug, type WizardContext } from "@/modules/onboarding";
import { StepContent, StepSkeleton, TITLES } from "./step-content";

export const stepMetadata = { title: "Set up", robots: { index: false } };

export type StepSearchParams = Promise<{ plan?: string; session_id?: string }>;

/**
 * Onboarding (MVP_SPEC 3.1, D-14). Every step saves through a Server Action, so a return resumes here. Each step has
 * its own small page that renders this (BUG-067): an unknown step then matches no route at all and answers a real
 * 404, which a [step] segment could not, since the app frame starts streaming before notFound() runs.
 */
export async function OnboardingStep({ step, searchParams }: { step: StepSlug; searchParams: StepSearchParams }) {
  const state = await getWizardState(stepPath(step));
  if (!canOpen(step, state)) redirect(stepPath(resumeStep(state) ?? "website"));

  const { plan, session_id: sessionId } = await searchParams;
  const { title, lead } = TITLES[step];
  return (
    <WizardFrame steps={frameSteps(step, state)} title={title} lead={lead} embedded={state.hasFinishedBusiness}>
      <Suspense fallback={<StepSkeleton step={step} />}>
        <StepContent step={step} state={state} plan={plan ?? null} returned={step === "card" && Boolean(sessionId)} />
      </Suspense>
    </WizardFrame>
  );
}

function frameSteps(current: StepSlug, state: WizardContext): FrameStep[] {
  return visibleSteps(state).map((s) => ({
    slug: s.slug,
    label: s.label,
    state: s.slug === current ? "current" : canOpen(s.slug, state) && isBefore(s.slug, current, state) ? "done" : "todo",
  }));
}

function isBefore(slug: StepSlug, current: StepSlug, state: WizardContext): boolean {
  const order = visibleSteps(state).map((s) => s.slug);
  const resume = resumeStep(state);
  // Steps after the current one also count as done when the user came back to edit an earlier step.
  return order.indexOf(slug) < order.indexOf(current) || (resume !== null && order.indexOf(slug) < order.indexOf(resume));
}
