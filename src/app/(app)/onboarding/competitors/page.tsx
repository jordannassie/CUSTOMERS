import { OnboardingStep, stepMetadata, type StepSearchParams } from "../_step/step-page";

export const metadata = stepMetadata;
// Blocking on purpose, like the admin layout (BUG-020): the resume redirect must happen before anything streams.
export const instant = false;

export default function CompetitorsStepPage({ searchParams }: { searchParams: StepSearchParams }) {
  return <OnboardingStep step="competitors" searchParams={searchParams} />;
}
