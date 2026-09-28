import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { WizardFrame, type FrameStep } from "@/components/onboarding/WizardFrame";
import { canOpen, getWizardState, isStepSlug, resumeStep, stepPath, visibleSteps, type StepSlug, type WizardContext } from "@/modules/onboarding";
import { StepContent, StepSkeleton, TITLES } from "./step-content";

export const metadata = { title: "Set up", robots: { index: false } };

// Blocking on purpose, like the admin layout (BUG-020): the resume redirect must happen before anything streams.
export const instant = false;

type Props = { params: Promise<{ step: string }>; searchParams: Promise<{ plan?: string; session_id?: string }> };

// Onboarding (MVP_SPEC 3.1, D-14). Every step saves through a Server Action, so a return resumes here.
export default async function OnboardingStepPage({ params, searchParams }: Props) {
  const { step } = await params;
  if (!isStepSlug(step)) notFound();
  const state = await getWizardState(stepPath(step));
  if (!canOpen(step, state)) redirect(stepPath(resumeStep(state) ?? "website"));

  const { plan, session_id: sessionId } = await searchParams;
  const { title, lead } = TITLES[step];
  return (
    <WizardFrame steps={frameSteps(step, state)} title={title} lead={lead} embedded={state.hasFinishedBusiness} wide={step === "competitors" || step === "models"}>
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
