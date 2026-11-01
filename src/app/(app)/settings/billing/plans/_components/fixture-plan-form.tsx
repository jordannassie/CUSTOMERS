"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { StartAction } from "./choose-plan";

// Dev and Playwright only (STRIPE_CHECKOUT_FIXTURES): stands in for Stripe's card fields and answers Stripe's own
// test card numbers the way Stripe does. Like the signup card step, the plan starts only when the webhook lands.
const SUCCESS = "4242424242424242";
const DECLINE = "4000000000000002";

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
      const card = number.replace(/\s/g, "");
      if (card === DECLINE) return setError("Your card was declined. Nothing was charged. Try another card.");
      if (card !== SUCCESS) return setError("Your card number is incomplete or not valid.");
      onAccepted();
    });
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
      {error && (
        <p role="alert" className="rounded-md bg-low-bg px-3 py-2 text-[13px] text-low-text">
          {error}
        </p>
      )}
      <Button type="submit" disabled={pending || !number.trim()} className="self-start">
        {pending && <Loader2 className="animate-spin" aria-hidden="true" />}
        {label}
      </Button>
    </form>
  );
}
