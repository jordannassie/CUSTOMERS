"use client";

import { useCallback, useMemo, useState } from "react";
import { BillingAddressElement, CheckoutElementsProvider, PaymentElement, useCheckoutElements } from "@stripe/react-stripe-js/checkout";
import { appearance, confirmErrorMessage, getStripeJs, LOAD_FAILED } from "@/app/(app)/_stripe/stripe-elements";
import { useCheckoutSession } from "@/app/(app)/_stripe/use-checkout-session";
import { forgetCheckout } from "@/lib/checkout-once";
import { StepActions, StepError } from "@/components/onboarding/StepBits";
import { Skeleton } from "@/components/ui/skeleton";
import type { ActionResult } from "@/modules/auth";

// Checkout Sessions with the Payment Element (D-38, ui_mode "elements"): the card fields are Stripe's
// frames inside our page. Loaded with ssr: false, so everything here runs in the browser only.

type Props = {
  businessId: string;
  publishableKey: string;
  /** Made with the page (loadCardStep); without it the session is asked for here. */
  clientSecret: string | null;
  start: (input: { businessId: string }) => Promise<ActionResult<{ clientSecret: string }>>;
  onAccepted: () => void;
};

export default function StripeCardForm({ businessId, publishableKey, clientSecret: made, start, onAccepted }: Props) {
  const [ownError, setOwnError] = useState<string | null>(null);
  // One Checkout Session per visit to this step, created by our server with the plan and metadata (BUG-105): usually
  // with the page, else asked for now. A session made with the page is its own key, so coming back after Change plan
  // uses the new plan's session, not one kept from the earlier visit.
  const key = made ? `card:${businessId}:${made}` : `card:${businessId}`;
  const create = useCallback(
    (): Promise<ActionResult<{ clientSecret: string }>> => (made ? Promise.resolve({ ok: true, data: { clientSecret: made } }) : start({ businessId })),
    [made, start, businessId],
  );
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

  if (ownError) return <StepError message={ownError} />;
  return (
    <CheckoutElementsProvider stripe={getStripeJs(publishableKey)} options={options}>
      <CardFields
        onAccepted={() => {
          forgetCheckout(key);
          onAccepted();
        }}
      />
    </CheckoutElementsProvider>
  );
}

function CardFields({ onAccepted }: { onAccepted: () => void }) {
  const state = useCheckoutElements();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (state.type === "error") return <StepError message={LOAD_FAILED} />;
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
    <form onSubmit={submit} className="flex flex-col gap-6">
      <BillingAddressElement />
      <PaymentElement options={{ layout: "tabs" }} />
      <StepError message={error} />
      <StepActions backHref="/onboarding/models" pending={pending} label="Start free trial" />
    </form>
  );
}
