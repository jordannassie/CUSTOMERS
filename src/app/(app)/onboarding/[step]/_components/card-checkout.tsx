"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { SecureNote, SettingUp, TrialSummary, type CardOffer } from "@/components/onboarding/CardBits";
import { FixtureCardForm } from "@/components/onboarding/FixtureCardForm";
import type { ActionResult } from "@/modules/auth";
import type { CardFormMode } from "@/modules/billing";

const StripeCardForm = dynamic(() => import("./stripe-card-form"), { ssr: false });

type Props = {
  businessId: string;
  offer: CardOffer;
  mode: CardFormMode;
  publishableKey: string | null;
  /** Back from a bank page with ?session_id: only the webhook can finish the step now. */
  returned: boolean;
  start: (input: { businessId: string }) => Promise<ActionResult<{ clientSecret: string }>>;
  check: (input: { businessId: string }) => Promise<ActionResult<{ done: boolean; next: string }>>;
};

// Step 8 (B-41): price and trial terms, the card form, then "Setting up your account" until the webhook lands.
export function CardCheckout({ businessId, offer, mode, publishableKey, returned, start, check }: Props) {
  const [accepted, setAccepted] = useState(returned);

  if (accepted) return <SettingUp businessId={businessId} check={check} />;
  return (
    <div className="flex flex-col gap-6">
      <TrialSummary offer={offer} />
      {mode === "fixture" ? (
        <FixtureCardForm businessId={businessId} start={start} onAccepted={() => setAccepted(true)} />
      ) : mode === "stripe" && publishableKey ? (
        <StripeCardForm businessId={businessId} publishableKey={publishableKey} start={start} onAccepted={() => setAccepted(true)} />
      ) : (
        <p role="alert" className="rounded-md bg-low-bg px-3 py-2 text-[13px] text-low-text">
          Card sign up isn&apos;t available right now. Please try again later.
        </p>
      )}
      <SecureNote />
    </div>
  );
}
