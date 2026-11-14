"use client";

import { useState, useTransition } from "react";
import { cardDigits, DECLINE_MESSAGE, FixtureCardFields, INVALID_MESSAGE, TEST_CARD } from "@/components/billing/FixtureCardFields";
import { FormError, PayButton } from "@/app/(app)/_stripe/form-bits";
import type { BuyAction, FixtureAction } from "./topup-checkout";

// Dev and Playwright only (STRIPE_CHECKOUT_FIXTURES).

type Props = {
  packId: string;
  label: string;
  buy: BuyAction;
  completeFixture: FixtureAction;
  onPaid: (sessionId: string) => void;
};

export function FixtureTopupForm({ packId, label, buy, completeFixture, onPaid }: Props) {
  const [number, setNumber] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const session = await buy({ packId });
      if (!session.ok) return setError(session.error);
      const card = cardDigits(number);
      if (card === TEST_CARD.decline) return setError(DECLINE_MESSAGE);
      if (card !== TEST_CARD.success) return setError(INVALID_MESSAGE);
      const paid = await completeFixture({ sessionId: session.data.sessionId, packId });
      if (!paid.ok) return setError(paid.error);
      onPaid(session.data.sessionId);
    });
  }

  return (
    <FixtureCardFields
      number={number}
      onNumber={setNumber}
      onSubmit={submit}
      error={<FormError message={error} />}
      actions={<PayButton label={label} pending={pending} disabled={!number.trim()} />}
    />
  );
}
