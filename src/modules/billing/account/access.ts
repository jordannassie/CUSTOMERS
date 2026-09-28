import "server-only";
import { getStripe, isStripeConfigured } from "../stripe";
import { stripePlanChangeClient, type PlanChangeStripe } from "../plan-change/client";
import type { PlanChangeData } from "../plan-change/dal";
import type { PlanChangeContext } from "../plan-change/planner";
import { topupFixtures } from "../topup/client";
import { fixturePlanChangeStripe, fixturePortal, withFixturePrices } from "./fixtures";

// Which Stripe the billing page and plan changes talk to: the real client, or with STRIPE_CHECKOUT_FIXTURES
// (never in production) an in-memory one, so dev and Playwright make no Stripe calls.

export type BillingAccess = { mode: "stripe" | "fixture"; context: PlanChangeContext; stripe: PlanChangeStripe };

/** Null when Stripe is not set up, so the page can say changes are unavailable instead of failing. */
export async function billingAccess(data: PlanChangeData): Promise<BillingAccess | null> {
  if (topupFixtures()) {
    const context = withFixturePrices(data.context);
    return { mode: "fixture", context, stripe: await fixturePlanChangeStripe(context) };
  }
  if (!isStripeConfigured()) return null;
  return { mode: "stripe", context: data.context, stripe: stripePlanChangeClient(getStripe()) };
}

/** The one call "Manage card and invoices" makes. Injected, so tests and Playwright never reach Stripe. */
export type PortalClient = {
  mode: "stripe" | "fixture";
  createSession(customerId: string, returnUrl: string): Promise<string>;
};

const stripePortal: PortalClient = {
  mode: "stripe",
  async createSession(customer, returnUrl) {
    // No configuration ID: Stripe uses the account's default portal settings (branding, invoices, card updates).
    const session = await getStripe().billingPortal.sessions.create({ customer, return_url: returnUrl });
    return session.url;
  },
};

export function portalClient(): PortalClient | null {
  if (topupFixtures()) return fixturePortal;
  return isStripeConfigured() ? stripePortal : null;
}
