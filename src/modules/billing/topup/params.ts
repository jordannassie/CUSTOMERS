import type Stripe from "stripe";
import type { Entitlement } from "@/modules/entitlements";

// Top-ups (B-43, MVP_SPEC 4.2, 11.5, D-22). Pure, so tests check every rule and parameter without Stripe or a database.

// One label for this flow in the Stripe Dashboard; the 8-letter suffix is Stripe's recommended format.
export const TOPUP_INTEGRATION_ID = "cd_topup_pack_rvkqzmle";

export type TopupPackPrice = { id: string; name: string; credits: number; priceCents: number; stripePriceId: string | null };

export type TopupSessionInput = {
  agencyId: string;
  pack: TopupPackPrice & { stripePriceId: string };
  /** The agency's Stripe customer, so the payment lands next to its subscription. */
  customerId: string | null;
  email: string | null;
  /** Where Stripe sends the user back after a bank check; must keep {CHECKOUT_SESSION_ID}. */
  returnUrl: string;
};

/**
 * A one-time payment for one pack. The metadata follows the webhook contract in README.md: the webhook
 * grants the pack's credits on checkout.session.completed, keyed by the session ID. No payment_method_types,
 * so Stripe picks the payment methods.
 */
export function topupSessionParams(input: TopupSessionInput): Stripe.Checkout.SessionCreateParams {
  const metadata = { agency_id: input.agencyId, kind: "topup", topup_pack_id: input.pack.id };
  return {
    mode: "payment",
    ui_mode: "elements",
    integration_identifier: TOPUP_INTEGRATION_ID,
    client_reference_id: input.agencyId,
    metadata,
    payment_intent_data: { metadata },
    line_items: [{ price: input.pack.stripePriceId, quantity: 1 }],
    // USD only (D-56): no conversion to the buyer's currency.
    adaptive_pricing: { enabled: false },
    ...(input.customerId
      ? { customer: input.customerId }
      : { customer_creation: "always" as const, ...(input.email ? { customer_email: input.email } : {}) }),
    return_url: input.returnUrl,
  };
}

export const TOPUP_ERRORS = {
  unknownPack: "That credit pack isn't available. Pick one of the packs on this page.",
  unavailable: "Buying credits isn't available right now. Please try again later.",
} as const;

export type TopupCheck = { ok: true; pack: TopupSessionInput["pack"] } | { ok: false; status: number; error: string };

/**
 * Whether this agency may buy this pack now. Top-ups are only spendable with an active plan or trial
 * (canSpendTopUps), so they are not sold without one either.
 */
export function checkTopupPurchase(packs: TopupPackPrice[], packId: string, spend: Entitlement): TopupCheck {
  if (!spend.allowed) return { ok: false, status: 403, error: spend.reason };
  const pack = packs.find((p) => p.id === packId);
  if (!pack) return { ok: false, status: 404, error: TOPUP_ERRORS.unknownPack };
  if (!pack.stripePriceId) return { ok: false, status: 503, error: TOPUP_ERRORS.unavailable };
  return { ok: true, pack: { ...pack, stripePriceId: pack.stripePriceId } };
}
