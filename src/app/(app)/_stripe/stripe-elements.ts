import { loadStripe, type Appearance, type Stripe } from "@stripe/stripe-js";

// Shared by the three Stripe payment forms (card step, Choose plan, Buy credits). Browser only.

export const LOAD_FAILED = "We couldn't load the card form. Refresh the page to try again.";

let stripePromise: Promise<Stripe | null> | null = null;
export const getStripeJs = (key: string) => (stripePromise ??= loadStripe(key));

// Stripe's frames cannot read our CSS variables, so the design tokens are passed in as values.
export function appearance(): Appearance {
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
      fontFamily: getComputedStyle(document.body).fontFamily,
      fontSizeBase: "14px",
    },
    rules: { ".Input": { borderColor: token("--cd-input-border"), boxShadow: "none" } },
  };
}

const TRY_AGAIN = /\s*(?:Please\s+)?try (?:a different|another) (?:card|payment method)\.?\s*$/i;
const CARD_PROBLEM = /declin|insufficient|funds|card|payment/i;

/**
 * BUG-107: Stripe's message already ends in "Try a different card." for some declines, which read twice with ours,
 * and a second decline comes without the paymentFailed code, which dropped "Nothing was charged".
 */
export function confirmErrorMessage(error: { message: string; code: string | null }): string {
  const message = error.message.trim();
  if (error.code !== "paymentFailed" && !CARD_PROBLEM.test(message)) return message;
  const base = message.replace(TRY_AGAIN, "").trim();
  return `${base}${/[.!?]$/.test(base) ? "" : "."} Nothing was charged. Try another card.`;
}
