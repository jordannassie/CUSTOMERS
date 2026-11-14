"use client";

import { useCallback } from "react";
import { CheckoutForm } from "@/app/(app)/_stripe/checkout-form";
import { FormError, PayButton } from "@/app/(app)/_stripe/form-bits";
import type { BuyAction } from "./topup-checkout";

type Props = {
  publishableKey: string;
  label: string;
  packId: string;
  buy: BuyAction;
  onPaid: (sessionId: string) => void;
};

// The page waits on the session it paid, so a second session for the same pack would leave it waiting (BUG-105).
export default function StripeTopupForm({ publishableKey, label, packId, buy, onPaid }: Props) {
  const create = useCallback(() => buy({ packId }), [buy, packId]);
  return (
    <CheckoutForm
      publishableKey={publishableKey}
      sessionKey={`topup:${packId}`}
      create={create}
      ErrorView={FormError}
      className="flex flex-col gap-4"
      actions={(pending) => <PayButton label={label} pending={pending} />}
      onConfirmed={(data) => onPaid(data.sessionId)}
    />
  );
}
