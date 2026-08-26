/**
 * Server-only Stripe client.
 *
 * Import this only from API routes and server components — never from client
 * components. The `stripe` export is null when STRIPE_SECRET_KEY is not set
 * so callers can degrade gracefully (show "Contact us" instead of checkout).
 */
import "server-only";
import Stripe from "stripe";

const key = process.env.STRIPE_SECRET_KEY;

if (!key) {
  console.warn("[stripe] STRIPE_SECRET_KEY is not set — self-serve billing is disabled.");
}

export const stripe: Stripe | null = key
  ? new Stripe(key, { apiVersion: "2026-07-29.dahlia", typescript: true })
  : null;

/**
 * Returns the Stripe client or throws if billing is not configured.
 * Use in routes that require billing to be active.
 */
export function requireStripe(): Stripe {
  if (!stripe) {
    throw new Error(
      "Stripe is not configured. Set STRIPE_SECRET_KEY in your environment.",
    );
  }
  return stripe;
}

/** True when Stripe billing is configured and usable. */
export const stripeEnabled = stripe !== null;
