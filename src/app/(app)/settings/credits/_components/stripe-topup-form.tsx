"use client";

import { useCallback, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { CheckoutElementsProvider, PaymentElement, useCheckoutElements } from "@stripe/react-stripe-js/checkout";
import { appearance, confirmErrorMessage, getStripeJs, LOAD_FAILED } from "@/app/(app)/_stripe/stripe-elements";
import { useCheckoutSession } from "@/app/(app)/_stripe/use-checkout-session";
import { forgetCheckout } from "@/lib/checkout-once";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FormError } from "./form-error";
import type { BuyAction } from "./topup-checkout";

// Checkout Sessions with the Payment Element (ui_mode "elements"): Stripe's card fields inside our page.
// Loaded with ssr: false, so everything here runs in the browser only.

type Props = {
  publishableKey: string;
  label: string;
  packId: string;
  buy: BuyAction;
  onPaid: (sessionId: string) => void;
};

export default function StripeTopupForm({ publishableKey, label, packId, buy, onPaid }: Props) {
  const [ownError, setOwnError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  // One Checkout Session per pack chosen, created by our server with the pack and metadata. The page waits on the
  // session it paid, so a second session for the same form would leave it waiting (BUG-105).
  const key = `topup:${packId}`;
  const create = useCallback(() => buy({ packId }), [buy, packId]);
  const session = useCheckoutSession(key, create);
  const clientSecret = useMemo(
    () =>
      session.then((r) => {
        if (r.ok) {
          setSessionId(r.data.sessionId);
          return r.data.clientSecret;
        }
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
        onPaid={() => {
          if (!sessionId) return;
          forgetCheckout(key);
          onPaid(sessionId);
        }}
      />
    </CheckoutElementsProvider>
  );
}

function CardFields({ label, onPaid }: { label: string; onPaid: () => void }) {
  const state = useCheckoutElements();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (state.type === "error") return <FormError message={LOAD_FAILED} />;
  if (state.type === "loading") {
    return (
      <div role="status" aria-busy className="flex flex-col gap-3">
        <span className="sr-only">Loading the card form…</span>
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
    onPaid();
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <PaymentElement options={{ layout: "tabs" }} />
      <FormError message={error} />
      <Button type="submit" disabled={pending} className="self-start">
        {pending && <Loader2 className="animate-spin" aria-hidden="true" />}
        {label}
      </Button>
    </form>
  );
}
