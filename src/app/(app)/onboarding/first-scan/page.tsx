import { redirect } from "next/navigation";
import { FirstScan } from "@/components/onboarding/FirstScan";
import { getScanStatus, startScan } from "@/modules/jobs";
import {
  FIRST_SCAN_PATH,
  checkTrialCredits,
  firstScanPhase,
  getAwaitingTrialCredits,
  getFirstScanProgress,
  getFirstScanSummary,
  getModelsStep,
} from "@/modules/onboarding";
import { MODELS } from "@/modules/settings/service";
import { getWorkspace } from "@/modules/workspace";

export const metadata = { title: "First scan", robots: { index: false } };

// Blocking on purpose, like the wizard pages (BUG-020): the redirects must happen before anything streams.
export const instant = false;

// MVP_SPEC 3.1 step 9: the first scan runs here, then the dashboard opens with a score.
export default async function FirstScanPage() {
  const workspace = await getWorkspace({ next: FIRST_SCAN_PATH });
  const business = workspace.businesses.find((b) => b.id === workspace.activeBusinessId);
  if (!business || business.status === "onboarding") redirect("/onboarding");

  const [status, setup, awaitingCredits] = await Promise.all([
    getScanStatus({ businessId: business.id }),
    getModelsStep(business.id, FIRST_SCAN_PATH),
    getAwaitingTrialCredits(FIRST_SCAN_PATH),
  ]);
  if (status.ok && firstScanPhase(status.data) === "done") redirect("/dashboard");

  const models = MODELS.filter((m) => setup?.models.includes(m.id)).map(({ id, label }) => ({ id, label }));
  return (
    <FirstScan
      businessId={business.id}
      businessName={business.name}
      models={models}
      questions={setup?.activeQuestions ?? 0}
      initial={status.ok ? status.data : null}
      awaitingCredits={awaitingCredits}
      start={startScan}
      getStatus={getScanStatus}
      checkCredits={checkTrialCredits}
      getProgress={getFirstScanProgress}
      getSummary={getFirstScanSummary}
    />
  );
}
