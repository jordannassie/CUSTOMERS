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
import { BILLING_HREF, BUY_CREDITS_HREF, CHOOSE_PLAN_HREF } from "@/modules/workspace";
import { PlanBill } from "./_components/plan-bill";
import { PortalButton } from "./_components/portal-button";
import { CancelPanel, CreditsPanel, NoPlan, PlanStatus } from "./_components/sections";
import { PageHeader } from "@/components/app/PageHeader";

export const metadata: Metadata = { title: "Billing", robots: { index: false } };

const USAGE_HREF = "/settings/usage";
// The open draft first, if any (ADD_BUSINESS_PATH), else a new business on the website step.
const ADD_BUSINESS_HREF = "/onboarding?add=1";

type Props = { searchParams: Promise<{ portal?: string | string[]; synced?: string | string[] }> };

// B-46, MVP_SPEC 8.1 and 11: what the agency pays, for which businesses, the next charge, and the changes.
export default async function BillingPage({ searchParams }: Props) {
  const { agency } = await requireAgency({ next: BILLING_HREF });
  const params = await searchParams;
  const loaded = await loadBillingPage(agency.id, { repair: params.synced === undefined });
  // Saved again from Stripe (BUG-121): load once more with fresh reads.
  if (loaded === "resynced") redirect(`${BILLING_HREF}?synced=1`);
  const view = loaded;
  const hasPlan = view.stripe !== "none" && view.status !== "canceled";

  return (
    <PageContainer>
      <div className="max-w-[760px]">
        <PageHeader
          title="Billing"
          description="What you pay, for which businesses, and when."
          actions={view.stripe !== "none" && <PortalButton open={openBillingPortal} variant={view.status === "past_due" ? "default" : "outline"} />}
        />

        {params.portal === "fixture" && (
          <p role="status" data-testid="portal-fixture" className="mt-4 rounded-md border border-border bg-primary-tint px-4 py-3 text-sm">
            Test mode: Stripe&apos;s card and invoice page opens here in a real run.
          </p>
        )}

        <div className="mt-6 flex flex-col gap-6">
          {hasPlan ? (
            <>
              <PlanStatus view={view} keep={keepSubscription} />
              <PlanBill
                view={view}
                addBusinessHref={ADD_BUSINESS_HREF}
                actions={{ upgrade: upgradeBusiness, downgrade: downgradeBusiness, remove: removeBusiness, add: addBusiness, keep: keepBusinessPlan }}
              />
              <CreditsPanel buyHref={BUY_CREDITS_HREF} usageHref={USAGE_HREF} />
              {view.canChange && !view.cancelAt && <CancelPanel cancel={cancelSubscription} trialing={view.status === "trialing"} />}
            </>
          ) : (
            <NoPlan ended={view.status === "canceled"} choosePlanHref={CHOOSE_PLAN_HREF} />
          )}
        </div>
      </div>
    </PageContainer>
  );
}
