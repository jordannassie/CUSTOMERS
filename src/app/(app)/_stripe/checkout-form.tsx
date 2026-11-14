"use client";

import { useMemo, useState, type ReactNode } from "react";
import { BillingAddressElement, CheckoutElementsProvider, PaymentElement, useCheckoutElements } from "@stripe/react-stripe-js/checkout";
import { forgetCheckout } from "@/lib/checkout-once";
import { Skeleton } from "@/components/ui/skeleton";
import type { ActionResult } from "@/modules/auth";
import { appearance, confirmErrorMessage, getStripeJs, LOAD_FAILED } from "./stripe-elements";
import { useCheckoutSession } from "./use-checkout-session";

// Checkout Sessions with the Payment Element (D-38, ui_mode "elements"): Stripe's card fields inside our page.
// Shared by the card step, Choose plan and Buy credits. Loaded with ssr: false, so it runs in the browser only.

type Props<T extends { clientSecret: string }> = {
  publishableKey: string;
  /** One Checkout Session per key, created by our server with the plan or pack and its metadata (BUG-105). */
  sessionKey: string;
  create: () => Promise<ActionResult<T>>;
  ErrorView: (props: { message: string | null }) => ReactNode;
  /** Card step and Choose plan ask for the billing address; Buy credits does not. */
  withAddress?: boolean;
  className: string;
  actions: (pending: boolean) => ReactNode;
  /** Called with the session's data once the payment is accepted. */
  onConfirmed: (data: T) => void;
};

export function CheckoutForm<T extends { clientSecret: string }>(props: Props<T>) {
  const { publishableKey, sessionKey, create, ErrorView, onConfirmed } = props;
  const [ownError, setOwnError] = useState<string | null>(null);
  const [data, setData] = useState<T | null>(null);
  const session = useCheckoutSession(sessionKey, create);
  const clientSecret = useMemo(
    () =>
      session.then((r) => {
        if (r.ok) {
          setData(r.data);
          return r.data.clientSecret;
        }
        setOwnError(r.error);
        throw new Error(r.error);
      }),
    [session],
  );
  const options = useMemo(() => ({ clientSecret, elementsOptions: { appearance: appearance() } }), [clientSecret]);

  if (ownError) return <ErrorView message={ownError} />;
  return (
    <CheckoutElementsProvider stripe={getStripeJs(publishableKey)} options={options}>
      <CardFields
        {...props}
        onAccepted={() => {
          if (!data) return;
          forgetCheckout(sessionKey);
          onConfirmed(data);
        }}
      />
    </CheckoutElementsProvider>
  );
}

type FieldsProps = Pick<Props<{ clientSecret: string }>, "ErrorView" | "withAddress" | "className" | "actions"> & {
  onAccepted: () => void;
};

function CardFields({ ErrorView, withAddress = false, className, actions, onAccepted }: FieldsProps) {
  const state = useCheckoutElements();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (state.type === "error") return <ErrorView message={LOAD_FAILED} />;
  if (state.type === "loading") {
    return (
      <div role="status" aria-busy className="flex flex-col gap-3">
        <span className="sr-only">Loading the card form…</span>
        <Skeleton className="h-10" />
        {withAddress && <Skeleton className="h-10" />}
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
    <form onSubmit={submit} className={className}>
      {withAddress && <BillingAddressElement />}
      <PaymentElement options={{ layout: "tabs" }} />
      <ErrorView message={error} />
      {actions(pending)}
    </form>
  );
}
