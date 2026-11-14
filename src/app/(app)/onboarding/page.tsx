import { redirect } from "next/navigation";
import { addBusinessStep, getWizardState, resumeStep, stepPath } from "@/modules/onboarding";

export const metadata = { title: "Set up", robots: { index: false } };

// Blocking on purpose, like the admin layout (BUG-020): the resume redirect must happen before anything streams.
export const instant = false;

// Sends a returning user to the step where they stopped (MVP_SPEC 3.1). ?plan= from the pricing page rides along.
// ?add=1 is every "Add a business" link (ADD_BUSINESS_PATH): the open draft continues where it stopped, else a new
// business starts on the website step, so an unfinished draft is never lost or refused.
export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ plan?: string; add?: string }> }) {
  const state = await getWizardState("/onboarding");
  const { plan, add } = await searchParams;
  const step = add ? addBusinessStep(state) : resumeStep(state);
  if (!step) redirect("/dashboard");
  const withPlan = plan && (step === "agency" || (step === "website" && !state.draft));
  redirect(withPlan ? `${stepPath(step)}?plan=${encodeURIComponent(plan)}` : stepPath(step));
}
