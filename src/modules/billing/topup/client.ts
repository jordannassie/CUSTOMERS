import "server-only";
import { randomUUID } from "node:crypto";
import type Stripe from "stripe";
import { env } from "@/lib/env";
import { getStripe, isStripeConfigured } from "../stripe";

/** The one Stripe call buying credits makes. Injected, so tests and Playwright never reach Stripe. */
export type TopupCheckoutClient = {
  mode: "stripe" | "fixture";
  createSession(params: Stripe.Checkout.SessionCreateParams): Promise<{ id: string; clientSecret: string }>;
};

// Same flag as the signup card step (B-41). Refused in production so a stray flag can never hand out free credits.
export const topupFixtures = () => env.STRIPE_CHECKOUT_FIXTURES === "true" && env.NODE_ENV !== "production";

export const FIXTURE_SESSION_PREFIX = "cs_fixture_topup_";

const fixtureClient: TopupCheckoutClient = {
  mode: "fixture",
  async createSession() {
    return { id: `${FIXTURE_SESSION_PREFIX}${randomUUID()}`, clientSecret: "cs_fixture_secret" };
  },
};

const stripeClient: TopupCheckoutClient = {
  mode: "stripe",
  async createSession(params) {
    const session = await getStripe().checkout.sessions.create(params);
    if (!session.client_secret) throw new Error(`Checkout Session ${session.id} has no client secret`);
    return { id: session.id, clientSecret: session.client_secret };
  },
};

/** Null when neither fixtures nor Stripe keys are set, so the page can say buying credits is unavailable. */
export function liveTopupClient(): TopupCheckoutClient | null {
  if (topupFixtures()) return fixtureClient;
  return isStripeConfigured() && env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ? stripeClient : null;
}
