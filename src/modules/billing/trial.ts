import "server-only";
import { env } from "@/lib/env";
import { trialEndDate, trialSessionParams, type TrialCheckoutInput } from "./checkout";
import { checkoutFixtures, liveCheckoutClient, type CheckoutClient } from "./checkout-client";
import { getPlanPrice, type PlanPrice } from "./dal";

// The card step's server side (B-41). Nothing here grants credits or marks the agency paid: only the
// webhook does that (MVP_SPEC 11.3), after Stripe confirms the subscription.

export type CardFormMode = "stripe" | "fixture" | "off";

export type TrialOffer = {
  planName: string;
  priceCents: number;
  /** ISO time; the screen shows the date in the user's own time zone. */
  trialEndsAt: string;
  mode: CardFormMode;
  publishableKey: string | null;
};

function cardFormMode(): CardFormMode {
  if (checkoutFixtures()) return "fixture";
  return liveCheckoutClient() ? "stripe" : "off";
}

/** What the card step shows for a plan, or null when the plan has no price. */
export async function getTrialOffer(planId: string, now = new Date()): Promise<TrialOffer | null> {
  const plan = await getPlanPrice(planId);
  if (!plan) return null;
  const mode = cardFormMode();
  return {
    planName: plan.name,
    priceCents: plan.priceCents,
    trialEndsAt: trialEndDate(now).toISOString(),
    mode,
    publishableKey: mode === "stripe" ? (env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? null) : null,
  };
}

export type StartTrialResult =
  | { ok: true; clientSecret: string }
  | { ok: false; status: 400 | 503; error: string };

const unavailable = { ok: false, status: 503, error: "Card sign up isn't available right now. Please try again later." } as const;

/** Creates the Checkout Session the card form runs on. */
export async function createTrialCheckout(
  input: Omit<TrialCheckoutInput, "priceId"> & { planId: string },
  client: CheckoutClient | null = liveCheckoutClient(),
  loadPlan: (planId: string) => Promise<PlanPrice | null> = getPlanPrice,
): Promise<StartTrialResult> {
  if (!client) return unavailable;
  const plan = await loadPlan(input.planId);
  if (!plan) return { ok: false, status: 400, error: "That plan isn't available. Pick a plan on the pricing page." };
  // Fixture mode runs before the Stripe catalog exists locally, so the price ID may still be empty.
  const priceId = plan.stripePriceId ?? (checkoutFixtures() ? `price_fixture_${plan.id}` : null);
  if (!priceId) {
    console.error(`[billing] plan ${plan.id} has no Stripe price; run the catalog sync (README.md)`);
    return unavailable;
  }
  const { agencyId, businessId, email, returnUrl } = input;
  const session = await client.createSession(trialSessionParams({ agencyId, businessId, email, returnUrl, priceId }));
  return { ok: true, clientSecret: session.clientSecret };
}
