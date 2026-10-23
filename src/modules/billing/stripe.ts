import "server-only";
import Stripe from "stripe";
import { env } from "@/lib/env";

// The app's only Stripe client (B-40, MVP_SPEC 11.1). Pinned so an SDK upgrade never changes API behavior silently.
export const STRIPE_API_VERSION = "2026-08-26.dahlia" as const;

/** Builds a client for a given key. The app uses getStripe(); the catalog scripts pass their own restricted key. */
export function createStripeClient(apiKey: string): Stripe {
  return new Stripe(apiKey, {
    apiVersion: STRIPE_API_VERSION,
    maxNetworkRetries: 2,
    appInfo: { name: "customers-direct" },
  });
}

let client: Stripe | null = null;

/** True when a Stripe key is set, so screens can show "Contact us" instead of checkout. */
export function isStripeConfigured(): boolean {
  return Boolean(env.STRIPE_SECRET_KEY);
}

/** Returns the single Stripe client. Created lazily so builds without a key still pass. */
export function getStripe(): Stripe {
  if (client) return client;
  const key = env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Stripe is not configured. Set STRIPE_SECRET_KEY.");
  client = createStripeClient(key);
  return client;
}
