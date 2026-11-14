"use client";

import { useState, useTransition } from "react";
import type { ActionResult } from "@/modules/auth";
import { Button } from "@/components/ui/button";
import { cardDigits, DECLINE_MESSAGE, FixtureCardFields, INVALID_MESSAGE, TEST_CARD } from "@/components/billing/FixtureCardFields";
import { StepActions, StepError } from "./StepBits";

// Dev and Playwright only (STRIPE_CHECKOUT_FIXTURES): the card step's stand-in for Stripe's card fields.
const BANK_FAILED = "We couldn't confirm this card with your bank. Try again or use another card.";

type Props = {
  businessId: string;
  start: (input: { businessId: string }) => Promise<ActionResult<{ clientSecret: string }>>;
  onAccepted: () => void;
};

export function FixtureCardForm({ businessId, start, onAccepted }: Props) {
  const [number, setNumber] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [bankCheck, setBankCheck] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const session = await start({ businessId });
      if (!session.ok) return setError(session.error);
      const card = cardDigits(number);
      if (card === TEST_CARD.success) return onAccepted();
      if (card === TEST_CARD.decline) return setError(DECLINE_MESSAGE);
      if (card === TEST_CARD.bankCheck) return setBankCheck(true);
      setError(INVALID_MESSAGE);
    });
  }

  if (bankCheck) {
    return (
      <div role="dialog" aria-label="Confirm with your bank" className="flex flex-col gap-3 rounded-md border border-border bg-surface p-5">
        <p className="text-sm font-medium">Confirm with your bank</p>
        <p className="text-[length:calc(13px*var(--px,1))] text-muted-foreground">Test mode: this stands in for your bank&apos;s security check.</p>
        <div className="flex gap-2">
          <Button type="button" onClick={onAccepted}>Complete</Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setBankCheck(false);
              setError(BANK_FAILED);
            }}
          >
            Fail
          </Button>
        </div>
      </div>
    );
  }

  return (
    <FixtureCardFields
      number={number}
      onNumber={setNumber}
      onSubmit={submit}
      error={<StepError message={error} />}
      actions={<StepActions backHref="/onboarding/models" pending={pending} label="Start free trial" disabled={!number.trim()} />}
    />
  );
}
