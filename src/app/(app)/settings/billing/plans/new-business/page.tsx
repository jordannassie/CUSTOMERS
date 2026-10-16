import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageContainer } from "@/components/app/PageContainer";
import { requireAgency } from "@/modules/auth";
import { getPlanNowStatus, getPublicPricing, loadPlanNowOffer, startPlanNow } from "@/modules/billing";
import { canAddBusiness, REASONS, TRIAL_MAX_BUSINESSES } from "@/modules/entitlements";
import { addBusinessStep, getWizardState, PLAN_IDS, stepPath } from "@/modules/onboarding";
import { BILLING_HREF } from "@/modules/workspace";
import { NewBusinessPlanPicker } from "./_components/plan-picker";

export const metadata: Metadata = { title: "Choose a plan", robots: { index: false } };

// Pick a plan before setting up a business after the first (D-57, D-56: one subscription item per business, its
// own price). "Set up another business" on Billing skips this and keeps matching the agency's other businesses.
// A trial at its business limit gets "Start my plan now" here instead of a Continue that can't turn on.
export default async function NewBusinessPlanPage() {
  const { agency } = await requireAgency({ next: BILLING_HREF });
  const [pricing, allowed, wizard] = await Promise.all([getPublicPricing(), canAddBusiness(agency.id), getWizardState(BILLING_HREF)]);
  // An unfinished draft is the business being added (one per agency): carry on with it, plan already chosen. At the
  // trial limit the page stays, so the plan can start now before the draft finishes.
  if (wizard.draft && allowed.allowed) redirect(stepPath(addBusinessStep(wizard)));
  const plans = pricing.plans.filter((p) => (PLAN_IDS as readonly string[]).includes(p.id));
  // D-16: the trial's business limit is the one block the agency can lift itself, by starting the plan today.
  const trialLimit = !allowed.allowed && allowed.reason === REASONS.trialBusinessLimit;
  const planNowView = trialLimit && plans.length > 0 ? await loadPlanNowOffer(agency.id) : null;

  return (
    <PageContainer>
      <div className="max-w-[760px]">
        <header>
          <h1 className="text-2xl font-semibold tracking-[-0.02em]">Choose a plan</h1>
          <p className="mt-1 text-[15px] text-muted-foreground">
            Pick a plan for the business you&apos;re about to set up. You can change it any time on Billing.
          </p>
        </header>
        <div className="mt-6">
          {plans.length === 0 ? (
            <p className="rounded-md border border-dashed border-border bg-surface px-6 py-10 text-center text-sm text-muted-foreground">
              Prices are being updated. Check back in a few minutes.
            </p>
          ) : (
            <NewBusinessPlanPicker
              plans={plans}
              nextHref={stepPath("website")}
              blockedReason={allowed.allowed ? null : allowed.reason}
              planNow={
                planNowView
                  ? { view: planNowView, start: startPlanNow, status: getPlanNowStatus, trialBusinesses: TRIAL_MAX_BUSINESSES }
                  : null
              }
              backHref={BILLING_HREF}
            />
          )}
        </div>
      </div>
    </PageContainer>
  );
}
