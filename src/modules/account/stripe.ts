import "server-only";
import { env } from "@/lib/env";
import { getStripe, isStripeConfigured } from "@/modules/billing";

/** The one Stripe call deleting an account makes. Injected, so tests and Playwright never reach Stripe. */
export type AccountStripeClient = {
  mode: "stripe" | "fixture";
  /** Ends the subscription now, with no refund and no final invoice (MVP_SPEC 23). Already ended is fine. */
  cancelNow(subscriptionId: string, idempotencyKey: string): Promise<void>;
};

// Same flag as checkout and top-ups (B-41, B-43); refused in production so it can never stand in for Stripe there.
const fixtures = () => env.STRIPE_CHECKOUT_FIXTURES === "true" && env.NODE_ENV !== "production";

const fixtureClient: AccountStripeClient = {
  mode: "fixture",
  async cancelNow() {},
};

const ENDED = new Set(["canceled", "incomplete_expired"]);

const stripeClient: AccountStripeClient = {
  mode: "stripe",
  async cancelNow(subscriptionId, idempotencyKey) {
    const stripe = getStripe();
    const sub = await stripe.subscriptions.retrieve(subscriptionId);
    if (ENDED.has(sub.status)) return;
    await stripe.subscriptions.cancel(subscriptionId, { invoice_now: false, prorate: false }, { idempotencyKey });
  },
};

/** Null when neither fixtures nor a Stripe key are set. */
export function accountStripeClient(): AccountStripeClient | null {
  if (fixtures()) return fixtureClient;
  return isStripeConfigured() ? stripeClient : null;
}
