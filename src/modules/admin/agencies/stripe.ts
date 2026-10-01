import "server-only";
import { env } from "@/lib/env";
import { getStripe, isStripeConfigured } from "@/modules/billing";

/** The Stripe calls the admin makes. Injected, so tests and Playwright never reach Stripe. */
export type AdminStripeClient = {
  mode: "stripe" | "fixture";
  extendTrial(subscriptionId: string, trialEnd: Date): Promise<void>;
  /** Money actually collected since `since` (and before `until`, when given), in cents, after refunds. */
  revenueSince(since: Date, until?: Date): Promise<number>;
};

// Same flag as checkout and top-ups (B-41, B-43); refused in production so it can never stand in for Stripe there.
const fixtures = () => env.STRIPE_CHECKOUT_FIXTURES === "true" && env.NODE_ENV !== "production";

const fixtureClient: AdminStripeClient = {
  mode: "fixture",
  async extendTrial() {},
  async revenueSince() {
    return 0;
  },
};

const stripeClient: AdminStripeClient = {
  mode: "stripe",
  async extendTrial(subscriptionId, trialEnd) {
    await getStripe().subscriptions.update(subscriptionId, {
      trial_end: Math.floor(trialEnd.getTime() / 1000),
      proration_behavior: "none",
    });
  },
  async revenueSince(since, until) {
    let cents = 0;
    const created = { gte: Math.floor(since.getTime() / 1000), ...(until && { lt: Math.floor(until.getTime() / 1000) }) };
    // Charges cover both plan invoices and one-time top-ups.
    for await (const charge of getStripe().charges.list({ created, limit: 100 })) {
      if (charge.paid && charge.status === "succeeded" && charge.currency === "usd") {
        cents += charge.amount - charge.amount_refunded;
      }
    }
    return cents;
  },
};

/** Null when neither fixtures nor a Stripe key are set, so screens can say Stripe is not connected. */
export function adminStripeClient(): AdminStripeClient | null {
  if (fixtures()) return fixtureClient;
  return isStripeConfigured() ? stripeClient : null;
}

export const adminStripeConnected = () => adminStripeClient() !== null;
