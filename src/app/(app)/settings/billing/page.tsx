import type { Metadata } from "next";
import { PageContainer } from "@/components/app/PageContainer";
import { requireAgency } from "@/modules/auth";
import {
  addBusiness,
  cancelSubscription,
  downgradeBusiness,
  keepSubscription,
  loadBillingPage,
  openBillingPortal,
  removeBusiness,
  upgradeBusiness,
} from "@/modules/billing";
import { BILLING_HREF, BUY_CREDITS_HREF } from "@/modules/workspace";
import { PlanBill } from "./_components/plan-bill";
import { PortalButton } from "./_components/portal-button";
import { CancelPanel, CreditsPanel, NoPlan, PlanStatus } from "./_components/sections";

export const metadata: Metadata = { title: "Billing", robots: { index: false } };

const USAGE_HREF = "/settings/usage";
const ADD_BUSINESS_HREF = "/dashboard/add-business";
const SUPPORT_HREF = "/contact?topic=support";

type Props = { searchParams: Promise<{ portal?: string | string[] }> };

// B-46, MVP_SPEC 8.1 and 11: what the agency pays, for which businesses, the next charge, and the changes.
export default async function BillingPage({ searchParams }: Props) {
  const { agency } = await requireAgency({ next: BILLING_HREF });
  const [view, params] = await Promise.all([loadBillingPage(agency.id), searchParams]);
  const hasPlan = view.stripe !== "none" && view.status !== "canceled";

  return (
    <PageContainer>
      <div className="max-w-[760px]">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-[-0.02em]">Billing</h1>
            <p className="mt-1 text-[15px] text-muted-foreground">What you pay, for which businesses, and when.</p>
          </div>
          {view.stripe !== "none" && <PortalButton open={openBillingPortal} variant={view.status === "past_due" ? "default" : "outline"} />}
        </header>

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
                actions={{ upgrade: upgradeBusiness, downgrade: downgradeBusiness, remove: removeBusiness, add: addBusiness }}
              />
              <CreditsPanel buyHref={BUY_CREDITS_HREF} usageHref={USAGE_HREF} />
              {view.canChange && !view.cancelAt && <CancelPanel cancel={cancelSubscription} />}
            </>
          ) : (
            <NoPlan ended={view.status === "canceled"} setupHref="/onboarding" supportHref={SUPPORT_HREF} />
          )}
        </div>
      </div>
    </PageContainer>
  );
}
