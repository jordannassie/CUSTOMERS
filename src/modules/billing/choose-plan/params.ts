import type Stripe from "stripe";
import { TRIAL_DAYS } from "../checkout";

// Choosing a plan after setup (BUG-079, BUG-066, D-56): one Checkout Session that starts a subscription with one
// item per set-up business on the chosen plan. Pure, so tests check every parameter without Stripe.

// One label for this flow in the Stripe Dashboard; the 8-letter suffix is Stripe's recommended format.
export const PLAN_INTEGRATION_ID = "cd_choose_plan_mvkqrtze";

export type PlanCheckoutInput = {
  agencyId: string;
  businessIds: string[];
  priceId: string;
  /** The agency's Stripe customer when it had a plan before, so a restart never makes a second customer. */
  customerId: string | null;
  email: string | null;
  /** Only an agency that never had a trial gets one (F-43). */
  trial: boolean;
  /** Where Stripe sends the user back after a bank check (3D Secure); must keep {CHECKOUT_SESSION_ID}. */
  returnUrl: string;
};

/** Same webhook contract as the signup trial (README.md): agency_id on the session and subscription, business_id per item. */
export function planSessionParams(input: PlanCheckoutInput): Stripe.Checkout.SessionCreateParams {
  return {
    mode: "subscription",
    ui_mode: "elements",
    integration_identifier: PLAN_INTEGRATION_ID,
    client_reference_id: input.agencyId,
    metadata: { agency_id: input.agencyId, kind: input.trial ? "trial" : "plan" },
    line_items: input.businessIds.map((businessId) => ({ price: input.priceId, quantity: 1, metadata: { business_id: businessId } })),
    subscription_data: {
      metadata: { agency_id: input.agencyId },
      ...(input.trial
        ? { trial_period_days: TRIAL_DAYS, trial_settings: { end_behavior: { missing_payment_method: "cancel" as const } } }
        : {}),
    },
    payment_method_collection: "always",
    billing_address_collection: "required",
    // USD only (D-56): no conversion to the buyer's currency.
    adaptive_pricing: { enabled: false },
    ...(input.customerId ? { customer: input.customerId } : input.email ? { customer_email: input.email } : {}),
    return_url: input.returnUrl,
  };
}
