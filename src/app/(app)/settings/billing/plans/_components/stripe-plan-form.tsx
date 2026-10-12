"use client";

import { useCallback, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { BillingAddressElement, CheckoutElementsProvider, PaymentElement, useCheckoutElements } from "@stripe/react-stripe-js/checkout";
import { appearance, confirmErrorMessage, getStripeJs, LOAD_FAILED } from "@/app/(app)/_stripe/stripe-elements";
import { useCheckoutSession } from "@/app/(app)/_stripe/use-checkout-session";
import { forgetCheckout } from "@/lib/checkout-once";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { StartAction } from "./choose-plan";

// Checkout Sessions with the Payment Element (D-38, ui_mode "elements"): Stripe's card fields inside our page.
// Loaded with ssr: false, so everything here runs in the browser only.

type Props = { publishableKey: string; planId: string; label: string; start: StartAction; onAccepted: () => void };

export default function StripePlanForm({ publishableKey, planId, label, start, onAccepted }: Props) {
  const [ownError, setOwnError] = useState<string | null>(null);
  // One Checkout Session per plan chosen, created by our server with the businesses and metadata (BUG-105).
  const key = `plan:${planId}`;
  const create = useCallback(() => start({ planId }), [start, planId]);
  const session = useCheckoutSession(key, create);
  const clientSecret = useMemo(
    () =>
      session.then((r) => {
        if (r.ok) return r.data.clientSecret;
        setOwnError(r.error);
        throw new Error(r.error);
      }),
    [session],
  );
  const options = useMemo(() => ({ clientSecret, elementsOptions: { appearance: appearance() } }), [clientSecret]);

  if (ownError) return <FormError message={ownError} />;
  return (
    <CheckoutElementsProvider stripe={getStripeJs(publishableKey)} options={options}>
      <CardFields
        label={label}
        onAccepted={() => {
          forgetCheckout(key);
          onAccepted();
        }}
      />
    </CheckoutElementsProvider>
  );
}

function CardFields({ label, onAccepted }: { label: string; onAccepted: () => void }) {
  const state = useCheckoutElements();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (state.type === "error") return <FormError message={LOAD_FAILED} />;
  if (state.type === "loading") {
    return (
      <div role="status" aria-busy className="flex flex-col gap-3">
        <span className="sr-only">Loading the card form…</span>
        <Skeleton className="h-10" />
        <Skeleton className="h-10" />
        <Skeleton className="h-24" />
      </div>
    );
  }
  const { checkout } = state;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    // Cards finish here (3D Secure opens in a Stripe window on this page); only bank redirects leave the page.
    const result = await checkout.confirm({ redirect: "if_required" });
    setPending(false);
    if (result.type === "error") {
      return setError(confirmErrorMessage(result.error));
    }
    onAccepted();
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <BillingAddressElement />
      <PaymentElement options={{ layout: "tabs" }} />
      <FormError message={error} />
      <Button type="submit" disabled={pending} className="self-start">
        {pending && <Loader2 className="animate-spin" aria-hidden="true" />}
        {label}
      </Button>
    </form>
  );
}

function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-md bg-low-bg px-3 py-2 text-[13px] text-low-text">
      {message}
    </p>
  );
}
