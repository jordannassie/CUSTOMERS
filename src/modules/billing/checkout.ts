import type Stripe from "stripe";

// The signup trial checkout (B-41, MVP_SPEC 11.2, 4.4). Pure, so tests check every parameter without Stripe.

export const TRIAL_DAYS = 7;

// One label for this flow in the Stripe Dashboard; the 8-letter suffix is Stripe's recommended format.
export const TRIAL_INTEGRATION_ID = "cd_onboarding_trial_qhxmwbte";

export type TrialCheckoutInput = {
  agencyId: string;
  businessId: string;
  priceId: string;
  email: string | null;
  /** Where Stripe sends the user back after a bank check (3D Secure); must keep {CHECKOUT_SESSION_ID}. */
  returnUrl: string;
};

/**
 * One subscription item for the business being set up, 7 days free, card and billing address required.
 * The metadata follows the webhook contract in README.md: agency_id on the session and subscription,
 * business_id on the item. No payment_method_types, so Stripe picks the payment methods.
 */
export function trialSessionParams(input: TrialCheckoutInput): Stripe.Checkout.SessionCreateParams {
  return {
    mode: "subscription",
    ui_mode: "elements",
    integration_identifier: TRIAL_INTEGRATION_ID,
    client_reference_id: input.agencyId,
    metadata: { agency_id: input.agencyId, kind: "trial" },
    line_items: [{ price: input.priceId, quantity: 1, metadata: { business_id: input.businessId } }],
    subscription_data: {
      trial_period_days: TRIAL_DAYS,
      metadata: { agency_id: input.agencyId },
      trial_settings: { end_behavior: { missing_payment_method: "cancel" } },
    },
    payment_method_collection: "always",
    billing_address_collection: "required",
    // USD only (D-56): no conversion to the buyer's currency.
    adaptive_pricing: { enabled: false },
    ...(input.email ? { customer_email: input.email } : {}),
    return_url: input.returnUrl,
  };
}

/**
 * F-43: one free trial per agency and per Stripe customer. An agency Stripe already knows has had its trial, so
 * it never starts another. grant_trial_credits holds the same line for the trial credits.
 */
export function trialAllowed(agency: { stripeCustomerId: string | null; stripeSubscriptionId: string | null }): boolean {
  return agency.stripeCustomerId === null && agency.stripeSubscriptionId === null;
}

/** When the trial ends if the card is added now; Stripe counts the same 7 days from the subscription start. */
export function trialEndDate(now: Date = new Date()): Date {
  return new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
}
