"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/modules/auth";
import { formatCount, formatUsd } from "@/modules/billing/format";
import type { TopUpStatus, TopupFormMode, TopupOffer } from "@/modules/billing";
import { FixtureTopupForm } from "./fixture-topup-form";
import { TopupProgress } from "./topup-progress";

const StripeTopupForm = dynamic(() => import("./stripe-topup-form"), { ssr: false });

export type BuyAction = (input: { packId: string }) => Promise<ActionResult<{ sessionId: string; clientSecret: string }>>;
export type StatusAction = (input: { sessionId: string }) => Promise<ActionResult<TopUpStatus>>;
export type FixtureAction = (input: { sessionId: string; packId: string }) => Promise<ActionResult<{ done: true }>>;

type Props = {
  packs: TopupOffer["packs"];
  mode: TopupFormMode;
  publishableKey: string | null;
  returnedSessionId: string | null;
  buy: BuyAction;
  status: StatusAction;
  completeFixture: FixtureAction;
};

// Pick a pack, pay on this page, then wait for the webhook to add the credits (B-43).
export function TopupCheckout({ packs, mode, publishableKey, returnedSessionId, buy, status, completeFixture }: Props) {
  const [packId, setPackId] = useState(packs[0].id);
  const [paying, setPaying] = useState(false);
  const [paidSession, setPaidSession] = useState(returnedSessionId);
  const pack = packs.find((p) => p.id === packId) ?? packs[0];

  if (paidSession) return <TopupProgress sessionId={paidSession} status={status} />;

  if (!paying) {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setPaying(true);
        }}
        className="flex flex-col gap-5"
      >
        <fieldset>
          <legend className="text-sm font-medium">Choose a pack</legend>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {packs.map((p) => (
              <label
                key={p.id}
                data-testid={`pack-${p.id}`}
                className={cn(
                  "flex cursor-pointer flex-col gap-1 rounded-md border bg-surface p-4 transition-colors has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
                  p.id === packId ? "border-primary bg-primary-tint" : "border-border hover:border-primary/40",
                )}
              >
                <input
                  type="radio"
                  name="pack"
                  value={p.id}
                  checked={p.id === packId}
                  onChange={() => setPackId(p.id)}
                  className="sr-only"
                />
                <span className="text-lg font-semibold tabular-nums">{formatCount(p.credits)} credits</span>
                <span className="text-sm">{formatUsd(p.priceCents)}</span>
                <span className="text-xs text-muted-foreground">{perCredit(p.priceCents, p.credits)} a credit</span>
              </label>
            ))}
          </div>
        </fieldset>
        {mode === "off" ? (
          <p role="alert" className="rounded-md bg-low-bg px-3 py-2 text-[13px] text-low-text">
            Buying credits isn&apos;t available right now. Please try again later.
          </p>
        ) : (
          <Button type="submit" className="self-start">
            Continue to payment
          </Button>
        )}
      </form>
    );
  }

  const label = `Pay ${formatUsd(pack.priceCents)}`;
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-surface px-4 py-3 text-sm">
        <span data-testid="chosen-pack">
          <span className="font-semibold">{formatCount(pack.credits)} credits</span> for {formatUsd(pack.priceCents)}
        </span>
        <Button type="button" variant="link" size="sm" onClick={() => setPaying(false)}>
          Change
        </Button>
      </div>
      {mode === "fixture" ? (
        <FixtureTopupForm packId={pack.id} label={label} buy={buy} completeFixture={completeFixture} onPaid={setPaidSession} />
      ) : publishableKey ? (
        <StripeTopupForm key={pack.id} publishableKey={publishableKey} label={label} packId={pack.id} buy={buy} onPaid={setPaidSession} />
      ) : null}
      <p className="text-xs text-muted-foreground">Payments are handled by Stripe. We never see or store your card number.</p>
    </div>
  );
}

function perCredit(priceCents: number, creditCount: number): string {
  const cents = priceCents / creditCount;
  return cents < 100 ? `${Number(cents.toFixed(1))}¢` : formatUsd(Math.round(cents));
}
