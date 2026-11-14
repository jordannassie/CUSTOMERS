import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { PageContainer } from "@/components/app/PageContainer";
import { requireAgency } from "@/modules/auth";
import {
  addBusiness,
  cancelSubscription,
  downgradeBusiness,
  keepBusinessPlan,
  keepSubscription,
  loadBillingPage,
  openBillingPortal,
  removeBusiness,
  upgradeBusiness,
} from "@/modules/billing";
import { canAddBusiness } from "@/modules/entitlements";
import { ADD_BUSINESS_PATH } from "@/modules/onboarding";
import { BILLING_HREF, BUY_CREDITS_HREF, CHOOSE_PLAN_HREF, SUPPORT_HREF } from "@/modules/workspace";
import { PlanBill } from "./_components/plan-bill";
import { PortalButton } from "./_components/portal-button";
import { CancelPanel, CreditsPanel, NoPlan, PlanStatus } from "./_components/sections";
import { PageHeader } from "@/components/app/PageHeader";

export const metadata: Metadata = { title: "Billing", robots: { index: false } };

const USAGE_HREF = "/settings/usage";

type Props = { searchParams: Promise<{ portal?: string | string[]; synced?: string | string[] }> };

// B-46, MVP_SPEC 8.1 and 11: what the agency pays, for which businesses, the next charge, and the changes.
export default async function BillingPage({ searchParams }: Props) {
  const { agency } = await requireAgency({ next: BILLING_HREF });
  const params = await searchParams;
  const [loaded, canAdd] = await Promise.all([
    loadBillingPage(agency.id, { repair: params.synced === undefined }),
    canAddBusiness(agency.id),
  ]);
  // Saved again from Stripe (BUG-121): load once more with fresh reads.
  if (loaded === "resynced") redirect(`${BILLING_HREF}?synced=1`);
  const view = loaded;
  // A plan Stripe no longer has can't be changed or paid here: start a new one instead (QA 2026-11-01).
  const gone = view.stripe === "missing" || view.stripe === "other_mode" ? view.stripe : null;
  const hasPlan = view.stripe !== "none" && !gone && view.status !== "canceled";

  return (
    <PageContainer>
      <>
        <PageHeader
          title="Billing"
          description="What you pay, for which businesses, and when."
          actions={view.stripe !== "none" && !gone && <PortalButton open={openBillingPortal} variant={view.status === "past_due" ? "default" : "outline"} />}
        />

        {params.portal === "fixture" && (
          <p role="status" data-testid="portal-fixture" className="mt-4 rounded-md border border-border bg-primary-tint px-4 py-3 text-sm">
            Test mode: Stripe&apos;s card and invoice page opens here in a real run.
          </p>
        )}

        <div className="mt-4 flex flex-col gap-4">
          {hasPlan ? (
            <>
              <PlanStatus view={view} keep={keepSubscription} />
              <PlanBill
                view={view}
                supportHref={SUPPORT_HREF}
                // Hidden when another business can't be added (the trial's limit, a cancelled plan): MVP test 2026-11-14.
                addBusinessHref={canAdd.allowed ? ADD_BUSINESS_PATH : null}
                actions={{ upgrade: upgradeBusiness, downgrade: downgradeBusiness, remove: removeBusiness, add: addBusiness, keep: keepBusinessPlan }}
              />
              <div className="grid items-start gap-4 lg:grid-cols-2">
                <CreditsPanel buyHref={BUY_CREDITS_HREF} usageHref={USAGE_HREF} />
                {view.canChange && !view.cancelAt && <CancelPanel cancel={cancelSubscription} trialing={view.status === "trialing"} trialEnded={view.trialEnded} />}
              </div>
            </>
          ) : (
            <NoPlan
              ended={view.status === "canceled"}
              gone={gone}
              choosePlanHref={CHOOSE_PLAN_HREF}
              supportHref={SUPPORT_HREF}
            />
          )}
        </div>
      </>
    </PageContainer>
  );
}
