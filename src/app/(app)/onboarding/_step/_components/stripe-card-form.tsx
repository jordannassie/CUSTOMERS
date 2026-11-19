"use client";

import { useCallback } from "react";
import { CheckoutForm } from "@/app/(app)/_stripe/checkout-form";
import { StepActions, StepError } from "@/components/onboarding/StepBits";
import type { ActionResult } from "@/modules/auth";

type Props = {
  businessId: string;
  publishableKey: string;
  /** Made with the page (loadCardStep); without it the session is asked for here. */
  clientSecret: string | null;
  start: (input: { businessId: string }) => Promise<ActionResult<{ clientSecret: string }>>;
  onAccepted: () => void;
};

export default function StripeCardForm({ businessId, publishableKey, clientSecret: made, start, onAccepted }: Props) {
  // One Checkout Session per visit to this step (BUG-105): usually made with the page, else asked for now. A session
  // made with the page is its own key, so coming back after Change plan uses the new plan's session.
  const key = made ? `card:${businessId}:${made}` : `card:${businessId}`;
  const create = useCallback(
    (): Promise<ActionResult<{ clientSecret: string }>> => (made ? Promise.resolve({ ok: true, data: { clientSecret: made } }) : start({ businessId })),
    [made, start, businessId],
  );
  return (
    <CheckoutForm
      publishableKey={publishableKey}
      sessionKey={key}
      create={create}
      ErrorView={StepError}
      withAddress
      className="flex flex-col gap-6"
      actions={(pending) => <StepActions backHref="/onboarding/models" pending={pending} label="Start free trial" />}
      onConfirmed={onAccepted}
    />
  );
}
