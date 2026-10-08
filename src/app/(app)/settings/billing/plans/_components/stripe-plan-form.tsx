"use client";

import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { loadStripe, type Appearance, type Stripe } from "@stripe/stripe-js";
import { BillingAddressElement, CheckoutElementsProvider, PaymentElement, useCheckoutElements } from "@stripe/react-stripe-js/checkout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { StartAction } from "./choose-plan";

// Checkout Sessions with the Payment Element (D-38, ui_mode "elements"): Stripe's card fields inside our page.
// Loaded with ssr: false, so everything here runs in the browser only.

type Props = { publishableKey: string; planId: string; label: string; start: StartAction; onAccepted: () => void };

const LOAD_FAILED = "We couldn't load the card form. Refresh the page to try again.";

let stripePromise: Promise<Stripe | null> | null = null;
const getStripeJs = (key: string) => (stripePromise ??= loadStripe(key));

// Stripe's frames cannot read our CSS variables, so the design tokens are passed in as values.
function appearance(): Appearance {
  const css = getComputedStyle(document.documentElement);
  const token = (name: string) => css.getPropertyValue(name).trim();
  return {
    theme: "stripe",
    variables: {
      colorPrimary: token("--cd-primary"),
      colorText: token("--cd-text"),
      colorTextSecondary: token("--cd-text-secondary"),
      colorDanger: token("--cd-low-text"),
      colorBackground: token("--cd-surface"),
      borderRadius: "4px",
      fontFamily: css.fontFamily,
      fontSizeBase: "14px",
    },
    rules: { ".Input": { borderColor: token("--cd-input-border"), boxShadow: "none" } },
  };
}

export default function StripePlanForm({ publishableKey, planId, label, start, onAccepted }: Props) {
  const [ownError, setOwnError] = useState<string | null>(null);
  // One Checkout Session per plan chosen, created by our server with the businesses and metadata.
  const clientSecret = useMemo(
    () =>
      start({ planId }).then((r) => {
        if (r.ok) return r.data.clientSecret;
        setOwnError(r.error);
        throw new Error(r.error);
      }),
    [planId, start],
  );
  const options = useMemo(() => ({ clientSecret, elementsOptions: { appearance: appearance() } }), [clientSecret]);

  if (ownError) return <FormError message={ownError} />;
  return (
    <CheckoutElementsProvider stripe={getStripeJs(publishableKey)} options={options}>
      <CardFields label={label} onAccepted={onAccepted} />
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
      const declined = result.error.code === "paymentFailed";
      return setError(declined ? `${result.error.message} Nothing was charged. Try another card.` : result.error.message);
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
