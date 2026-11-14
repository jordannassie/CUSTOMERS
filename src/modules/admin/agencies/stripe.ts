import "server-only";
import { cacheLife } from "next/cache";
import { env } from "@/lib/env";
import { extendSubscriptionTrial, getStripe, isStripeConfigured, setSubscriptionPaused, subscriptionAgencyStatus, type PauseOutcome } from "@/modules/billing";
import type { BillingStatus } from "./service";

/** The Stripe calls the admin makes. Injected, so tests and Playwright never reach Stripe. */
export type AdminStripeClient = {
  mode: "stripe" | "fixture";
  extendTrial(subscriptionId: string, trialEnd: Date): Promise<void>;
  /**
   * Money actually collected since `since` (and before `until`, when given), in cents, after refunds. Charges to the
   * Stripe customers in `excludeCustomers` (test agencies') are left out.
   */
  revenueSince(since: Date, until?: Date, excludeCustomers?: string[]): Promise<number>;
  /**
   * The status the subscription has in Stripe now ("canceled" when Stripe has no such subscription), or null when
   * there is nothing to go on (fixtures, or a first payment still in progress).
   */
  subscriptionStatus(subscriptionId: string): Promise<BillingStatus | null>;
  /** Stops (or restarts) charging the subscription while the agency is suspended; see billing/pause-billing.ts. */
  setBillingPaused(subscriptionId: string, paused: boolean): Promise<PauseOutcome>;
};

// Same flag as checkout and top-ups (B-41, B-43); refused in production so it can never stand in for Stripe there.
const fixtures = () => env.STRIPE_CHECKOUT_FIXTURES === "true" && env.NODE_ENV !== "production";

const fixtureClient: AdminStripeClient = {
  mode: "fixture",
  async extendTrial() {},
  async revenueSince() {
    return 0;
  },
  async subscriptionStatus() {
    return null;
  },
  async setBillingPaused() {
    return "nothing_in_stripe";
  },
};

/**
 * Money collected between two times, kept for 5 minutes: the Overview asked Stripe for every charge of the month, twice,
 * on each visit (admin review 2026-11-12). The end is rounded down to 5 minutes, so repeat visits hit the cache. The
 * left-out customers are part of the cache key, so the Overview with and without test agencies are cached apart.
 */
async function collectedCents(sinceIso: string, untilIso: string | null, excluded: string[]): Promise<number> {
  "use cache";
  cacheLife({ stale: 60, revalidate: 300, expire: 900 });
  let cents = 0;
  const created = { gte: Math.floor(Date.parse(sinceIso) / 1000), ...(untilIso && { lt: Math.floor(Date.parse(untilIso) / 1000) }) };
  // Charges cover both plan invoices and one-time top-ups.
  const skip = new Set(excluded);
  for await (const charge of getStripe().charges.list({ created, limit: 100 })) {
    const customer = typeof charge.customer === "string" ? charge.customer : (charge.customer?.id ?? null);
    if (customer && skip.has(customer)) continue;
    if (charge.paid && charge.status === "succeeded" && charge.currency === "usd") {
      cents += charge.amount - charge.amount_refunded;
    }
  }
  return cents;
}

const FIVE_MINUTES = 5 * 60 * 1000;
const roundDown = (d: Date) => new Date(Math.floor(d.getTime() / FIVE_MINUTES) * FIVE_MINUTES).toISOString();

const stripeClient: AdminStripeClient = {
  mode: "stripe",
  extendTrial: extendSubscriptionTrial,
  revenueSince: (since, until, excludeCustomers = []) =>
    collectedCents(since.toISOString(), until ? roundDown(until) : null, [...excludeCustomers].sort()),
  subscriptionStatus: subscriptionAgencyStatus,
  setBillingPaused: setSubscriptionPaused,
};

/** Null when neither fixtures nor a Stripe key are set, so screens can say Stripe is not connected. */
export function adminStripeClient(): AdminStripeClient | null {
  if (fixtures()) return fixtureClient;
  return isStripeConfigured() ? stripeClient : null;
}

export const adminStripeConnected = () => adminStripeClient() !== null;
