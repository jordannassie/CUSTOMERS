import type { Metadata } from "next";
import Link from "next/link";
import { PageContainer } from "@/components/app/PageContainer";
import { credits } from "@/components/usage/format";
import { buyTopUp, completeFixtureTopUp, getTopUpStatus, getTopupOffer } from "@/modules/billing";
import { requireAgency } from "@/modules/auth";
import { getBalance } from "@/modules/credits";
import { canSpendTopUps } from "@/modules/entitlements";
import { BILLING_HREF, BUY_CREDITS_HREF } from "@/modules/workspace";
import { TopupCheckout } from "./_components/topup-checkout";

export const metadata: Metadata = { title: "Buy credits" };

type Props = { searchParams: Promise<{ session_id?: string | string[] }> };

// B-43, MVP_SPEC 4.2, D-22: one-time credit packs, paid with Stripe's card form on this page.
export default async function BuyCreditsPage({ searchParams }: Props) {
  const { agency } = await requireAgency({ next: BUY_CREDITS_HREF });
  const [offer, spend, balance, params] = await Promise.all([
    getTopupOffer(),
    canSpendTopUps(agency.id),
    getBalance(agency.id),
    searchParams,
  ]);
  const total = balance.balance ?? 0;
  // Back from a bank check with ?session_id: the payment is done, only the webhook is left.
  const returned = typeof params.session_id === "string" && params.session_id.startsWith("cs_") ? params.session_id : null;

  return (
    <PageContainer>
      <header>
        <h1 className="text-2xl font-semibold tracking-[-0.02em]">Buy credits</h1>
        <p className="mt-1 text-[15px] text-muted-foreground">
          Top-up credits never expire. We use them after your plan credits, while you have an active plan or trial.
        </p>
        <p data-testid="current-balance" className="mt-3 text-sm">
          {total < 0 ? (
            <span className="font-medium text-low-text">
              You&apos;re {credits(-total)} over. A top-up pays that back first.
            </span>
          ) : (
            <>
              You have <span className="font-semibold tabular-nums">{credits(total)}</span> left.
            </>
          )}
        </p>
      </header>

      <div className="mt-6 max-w-[640px]">
        {!spend.allowed && !returned ? (
          <Notice>
            {spend.reason}{" "}
            <Link href={BILLING_HREF} className="font-medium underline underline-offset-4 hover:no-underline">
              Go to billing
            </Link>
          </Notice>
        ) : offer.packs.length === 0 ? (
          <Notice>No credit packs are on sale right now. Please check back later.</Notice>
        ) : (
          <TopupCheckout
            packs={offer.packs}
            mode={offer.mode}
            publishableKey={offer.publishableKey}
            returnedSessionId={returned}
            buy={buyTopUp}
            status={getTopUpStatus}
            completeFixture={completeFixtureTopUp}
          />
        )}
      </div>
    </PageContainer>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" data-testid="topup-blocked" className="rounded-md border border-low/30 bg-low-bg px-3.5 py-2.5 text-sm text-low-text">
      {children}
    </p>
  );
}
