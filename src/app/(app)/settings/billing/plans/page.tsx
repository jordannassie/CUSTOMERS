import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PageContainer } from "@/components/app/PageContainer";
import { Button } from "@/components/ui/button";
import { getCurrentAgency, requireAgency, requireUser } from "@/modules/auth";
import { getPlanStartStatus, loadChoosePlanPage, startPlanCheckout } from "@/modules/billing";
import { BILLING_HREF, CHOOSE_PLAN_HREF } from "@/modules/workspace";
import { ChoosePlan } from "./_components/choose-plan";

export const metadata: Metadata = { title: "Choose a plan", robots: { index: false } };

type Props = { searchParams: Promise<{ plan?: string | string[]; session_id?: string | string[] }> };

// BUG-079, BUG-066, D-56: choose a plan after setup, or start an ended plan again, paid on this page.
export default async function ChoosePlanPage({ searchParams }: Props) {
  const params = await searchParams;
  const wanted = typeof params.plan === "string" ? params.plan : null;
  await requireUser({ next: CHOOSE_PLAN_HREF });
  // Signed in from the pricing page before setting up: setup carries the plan (B-41).
  if (!(await getCurrentAgency())) redirect(wanted ? `/onboarding?plan=${encodeURIComponent(wanted)}` : "/onboarding");
  const { agency } = await requireAgency({ next: CHOOSE_PLAN_HREF });
  const page = await loadChoosePlanPage(agency.id);
  // Back from a bank check with ?session_id: the card is done, only the webhook is left.
  const returned = typeof params.session_id === "string" && params.session_id.startsWith("cs_");

  // Plan changes for a running subscription live on the Billing page.
  if (page.state.kind === "has_plan") redirect(BILLING_HREF);

  return (
    <PageContainer>
      <div className="max-w-[760px]">
        <header>
          <h1 className="text-2xl font-semibold tracking-[-0.02em]">
            {page.state.kind === "choose" && page.state.ended ? "Start your plan again" : "Choose a plan"}
          </h1>
          <p className="mt-1 text-[15px] text-muted-foreground">One plan for each of your businesses. You can change it any time on Billing.</p>
        </header>
        <div className="mt-6">
          {page.state.kind === "no_business" ? (
            <section className="rounded-md border border-dashed border-border bg-surface px-6 py-10 text-center" data-testid="no-business">
              <h2 className="text-base font-semibold tracking-[-0.02em]">Set up a business first</h2>
              <p className="mx-auto mt-2 max-w-[440px] text-sm text-muted-foreground">Each plan covers one business. Add yours, then choose its plan.</p>
              <Button asChild className="mt-5">
                <Link href="/onboarding">Set up a business</Link>
              </Button>
            </section>
          ) : (
            <ChoosePlan
              state={page.state}
              mode={page.mode}
              publishableKey={page.publishableKey}
              initialPlanId={wanted}
              returned={returned}
              start={startPlanCheckout}
              status={getPlanStartStatus}
            />
          )}
        </div>
      </div>
    </PageContainer>
  );
}
