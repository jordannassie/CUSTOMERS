import { NotFoundPage } from "@/components/site/NotFoundPage";
import { getWizardState } from "@/modules/onboarding";

// Once a business is set up this renders inside the app frame, which already shows the logo (UI-011).
export default async function OnboardingStepNotFound() {
  const state = await getWizardState("/onboarding");
  return <NotFoundPage embedded={state.hasFinishedBusiness} />;
}
