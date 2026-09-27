import { redirect } from "next/navigation";
import { getWizardState, resumeStep, stepPath } from "@/modules/onboarding";

export const metadata = { title: "Set up", robots: { index: false } };

// Blocking on purpose, like the admin layout (BUG-020): the resume redirect must happen before anything streams.
export const instant = false;

// Sends a returning user to the step where they stopped (MVP_SPEC 3.1). ?plan= from the pricing page rides along.
export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ plan?: string }> }) {
  const state = await getWizardState("/onboarding");
  const step = resumeStep(state);
  if (!step) redirect("/dashboard");
  const { plan } = await searchParams;
  redirect(step === "agency" && plan ? `${stepPath(step)}?plan=${encodeURIComponent(plan)}` : stepPath(step));
}
