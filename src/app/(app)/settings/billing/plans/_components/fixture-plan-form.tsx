"use client";

import { useState, useTransition } from "react";
import { cardDigits, DECLINE_MESSAGE, FixtureCardFields, INVALID_MESSAGE, TEST_CARD } from "@/components/billing/FixtureCardFields";
import { FormError, PayButton } from "@/app/(app)/_stripe/form-bits";
import type { StartAction } from "./choose-plan";

// Dev and Playwright only (STRIPE_CHECKOUT_FIXTURES). Like the signup card step, the plan starts only when the
// webhook lands.

type Props = { planId: string; label: string; start: StartAction; onAccepted: () => void };

export function FixturePlanForm({ planId, label, start, onAccepted }: Props) {
  const [number, setNumber] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const session = await start({ planId });
      if (!session.ok) return setError(session.error);
      const card = cardDigits(number);
      if (card === TEST_CARD.decline) return setError(DECLINE_MESSAGE);
      if (card !== TEST_CARD.success) return setError(INVALID_MESSAGE);
      onAccepted();
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
