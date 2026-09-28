import { randomBytes } from "node:crypto";
import Stripe from "stripe";

// Stripe event fixtures in the 2026-08-26.dahlia payload shapes (invoice.parent, line.parent, line.pricing,
// items[].current_period_end), signed with a secret made per run. No Stripe calls, no committed secrets.

const DAY = 86_400;
export const nowSeconds = () => Math.floor(Date.now() / 1000);
export const id = (prefix: string) => `${prefix}_test${randomBytes(8).toString("hex")}`;

export function webhookSecret(): string {
  return `whsec_${randomBytes(24).toString("hex")}`;
}

export function signedPayload(event: Stripe.Event, secret: string) {
  const payload = JSON.stringify(event);
  return { payload, signature: Stripe.webhooks.generateTestHeaderString({ payload, secret }) };
}

export function event<T extends Stripe.Event["type"]>(type: T, object: unknown): Stripe.Event {
  return {
    id: id("evt"),
    object: "event",
    api_version: "2026-08-26.dahlia",
    created: nowSeconds(),
    livemode: false,
    pending_webhooks: 1,
    request: { id: null, idempotency_key: null },
    type,
    data: { object },
  } as unknown as Stripe.Event;
}

export { invoice, line, type LineInput } from "../stripe-objects";

export type ItemInput = { product: string; businessId?: string; id?: string; periodEnd: number };

export function subscription(input: {
  id?: string;
  customer: string;
  agencyId?: string;
  status: Stripe.Subscription.Status;
  trialEnd?: number | null;
  cancelAtPeriodEnd?: boolean;
  items: ItemInput[];
}): Stripe.Subscription {
  const subId = input.id ?? id("sub");
  return {
    id: subId,
    object: "subscription",
    customer: input.customer,
    status: input.status,
    cancel_at_period_end: input.cancelAtPeriodEnd ?? false,
    trial_end: input.trialEnd ?? null,
    metadata: input.agencyId ? { agency_id: input.agencyId } : {},
    items: {
      object: "list",
      has_more: false,
      url: `/v1/subscription_items?subscription=${subId}`,
      data: input.items.map((item) => ({
        id: item.id ?? id("si"),
        object: "subscription_item",
        quantity: 1,
        metadata: item.businessId ? { business_id: item.businessId } : {},
        price: { id: id("price"), object: "price", product: item.product },
        current_period_start: item.periodEnd - 30 * DAY,
        current_period_end: item.periodEnd,
        subscription: subId,
      })),
    },
  } as unknown as Stripe.Subscription;
}

export function checkoutSession(input: {
  mode: "subscription" | "payment";
  customer: string;
  agencyId: string;
  subscriptionId?: string;
  paymentStatus?: "paid" | "unpaid";
  metadata?: Record<string, string>;
}): Stripe.Checkout.Session {
  return {
    id: id("cs"),
    object: "checkout.session",
    mode: input.mode,
    customer: input.customer,
    subscription: input.subscriptionId ?? null,
    client_reference_id: input.agencyId,
    payment_status: input.paymentStatus ?? "paid",
    status: "complete",
    metadata: { agency_id: input.agencyId, ...input.metadata },
  } as unknown as Stripe.Checkout.Session;
}

export { DAY };
