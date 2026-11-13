import "server-only";
import { env } from "@/lib/env";
import { getStripe, isStripeConfigured } from "../stripe";
import { stripePlanChangeClient, type PlanChangeStripe } from "../plan-change/client";
import type { PlanChangeData } from "../plan-change/dal";
import type { PlanChangeContext } from "../plan-change/planner";
import { topupFixtures } from "../topup/client";
import { syncSubscriptionFromStripe } from "../webhooks";
import type { StripeSync } from "../webhooks/sync";
import { fixturePlanChangeStripe, fixturePortal, fixtureSync, withFixturePrices } from "./fixtures";

// Which Stripe the billing page and plan changes talk to: the real client, or with STRIPE_CHECKOUT_FIXTURES
// (never in production) an in-memory one, so dev and Playwright make no Stripe calls.

export type BillingAccess = {
  mode: "stripe" | "fixture";
  context: PlanChangeContext;
  stripe: PlanChangeStripe;
  /** Applies the subscription and its latest paid invoice the way the webhooks do (A1, 2026-10-15). */
  sync: (subscriptionId: string) => Promise<StripeSync>;
};

/** Null when Stripe is not set up, so the page can say changes are unavailable instead of failing. */
export async function billingAccess(data: PlanChangeData): Promise<BillingAccess | null> {
  if (topupFixtures()) {
    const context = withFixturePrices(data.context);
    return { mode: "fixture", context, stripe: await fixturePlanChangeStripe(context), sync: await fixtureSync(context) };
  }
  if (!isStripeConfigured()) return null;
  return { mode: "stripe", context: data.context, stripe: stripePlanChangeClient(getStripe()), sync: syncSubscriptionFromStripe };
}

/** The one call "Manage card and invoices" makes. Injected, so tests and Playwright never reach Stripe. */
export type PortalClient = {
  mode: "stripe" | "fixture";
  createSession(customerId: string, returnUrl: string): Promise<string>;
};

const stripePortal: PortalClient = {
  mode: "stripe",
  async createSession(customer, returnUrl) {
    // With STRIPE_PORTAL_CONFIGURATION the live settings are named; without it Stripe uses the account's default ones.
    const configuration = env.STRIPE_PORTAL_CONFIGURATION;
    const started = Date.now();
    const session = await getStripe().billingPortal.sessions.create({ customer, return_url: returnUrl, ...(configuration && { configuration }) });
    // One line per open, so a slow portal shows in the host logs as Stripe's time or ours.
    console.info(`[billing/portal] Stripe session in ${Date.now() - started} ms`);
    return session.url;
  },
};

export function portalClient(): PortalClient | null {
  if (topupFixtures()) return fixturePortal;
  return isStripeConfigured() ? stripePortal : null;
}
