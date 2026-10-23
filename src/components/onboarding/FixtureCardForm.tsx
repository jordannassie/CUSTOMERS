"use client";

import { useState, useTransition } from "react";
import type { ActionResult } from "@/modules/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StepActions, StepError } from "./StepBits";

// Dev and Playwright only (STRIPE_CHECKOUT_FIXTURES): stands in for Stripe's card fields and answers
// Stripe's own test card numbers the way Stripe does, so the flow is tested without calling Stripe.
const SUCCESS = "4242424242424242";
const DECLINE = "4000000000000002";
const BANK_CHECK = "4000002500003155";

export const DECLINED = "Your card was declined.";
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
      const card = number.replace(/\s/g, "");
      if (card === SUCCESS) return onAccepted();
      if (card === DECLINE) return setError(`${DECLINED} Nothing was charged. Try another card.`);
      if (card === BANK_CHECK) return setBankCheck(true);
      setError("Your card number is incomplete or not valid.");
    });
  }

  if (bankCheck) {
    return (
      <div role="dialog" aria-label="Confirm with your bank" className="flex flex-col gap-3 rounded-md border border-border bg-surface p-5">
        <p className="text-sm font-medium">Confirm with your bank</p>
        <p className="text-[13px] text-muted-foreground">Test mode: this stands in for your bank&apos;s security check.</p>
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
    <form onSubmit={submit} className="flex flex-col gap-4">
      <p className="rounded-md bg-mid-bg px-3 py-2 text-[13px] text-mid-text">Test mode. No real card is used and Stripe is not called.</p>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="card-number">Card number</Label>
        <Input
          id="card-number"
          inputMode="numeric"
          autoComplete="off"
          value={number}
          onChange={(e) => setNumber(e.target.value)}
          placeholder="4242 4242 4242 4242"
        />
      </div>
      <StepError message={error} />
      <StepActions backHref="/onboarding/models" pending={pending} label="Start free trial" disabled={!number.trim()} />
    </form>
  );
}
