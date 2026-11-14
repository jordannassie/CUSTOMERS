"use client";

import type { ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Dev and Playwright only (STRIPE_CHECKOUT_FIXTURES): stands in for Stripe's card fields and answers Stripe's own
// test card numbers the way Stripe does, so payment flows are tested without calling Stripe. Shared by the card
// step, Choose plan and Buy credits.

export const TEST_CARD = { success: "4242424242424242", decline: "4000000000000002", bankCheck: "4000002500003155" };
export const DECLINE_MESSAGE = "Your card was declined. Nothing was charged. Try another card.";
export const INVALID_MESSAGE = "Your card number is incomplete or not valid.";

/** The test card number without spaces. */
export const cardDigits = (number: string) => number.replace(/\s/g, "");

type Props = {
  number: string;
  onNumber: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  /** The form's error message, already rendered. */
  error: ReactNode;
  actions: ReactNode;
};

export function FixtureCardFields({ number, onNumber, onSubmit, error, actions }: Props) {
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <p className="rounded-md bg-mid-bg px-3 py-2 text-[length:calc(13px*var(--px,1))] text-mid-text">Test mode. No real card is used and Stripe is not called.</p>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="card-number">Card number</Label>
        <Input
          id="card-number"
          inputMode="numeric"
          autoComplete="off"
          value={number}
          onChange={(e) => onNumber(e.target.value)}
          placeholder="4242 4242 4242 4242"
        />
      </div>
      {error}
      {actions}
    </form>
  );
}
