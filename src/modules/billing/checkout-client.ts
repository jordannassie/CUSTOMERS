import "server-only";
import { randomUUID } from "node:crypto";
import type Stripe from "stripe";
import { env } from "@/lib/env";
import { getStripe, isStripeConfigured } from "./stripe";

/** The one Stripe call the card step makes. Injected, so tests and Playwright never reach Stripe. */
export type CheckoutClient = {
  createSession(params: Stripe.Checkout.SessionCreateParams): Promise<{ id: string; clientSecret: string }>;
};

// Refused in production so a stray flag can never let someone skip paying.
export const checkoutFixtures = () => env.STRIPE_CHECKOUT_FIXTURES === "true" && env.NODE_ENV !== "production";

export const FIXTURE_CLIENT_SECRET = "cs_fixture_secret";

const fixtureClient: CheckoutClient = {
  async createSession() {
    return { id: `cs_fixture_${randomUUID()}`, clientSecret: FIXTURE_CLIENT_SECRET };
  },
};

const stripeClient: CheckoutClient = {
  async createSession(params) {
    const session = await getStripe().checkout.sessions.create(params);
    if (!session.client_secret) throw new Error(`Checkout Session ${session.id} has no client secret`);
    return { id: session.id, clientSecret: session.client_secret };
  },
};

/** Null when neither fixtures nor Stripe keys are set, so the step can say card sign up is unavailable. */
export function liveCheckoutClient(): CheckoutClient | null {
  if (checkoutFixtures()) return fixtureClient;
  return isStripeConfigured() && env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ? stripeClient : null;
}
