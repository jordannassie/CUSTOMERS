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

export type LineInput = {
  product: string;
  amount: number;
  quantity?: number;
  proration?: boolean;
  itemId?: string;
  subscriptionId: string;
  start: number;
  end: number;
};

export function line(input: LineInput): Stripe.InvoiceLineItem {
  return {
    id: id("il"),
    object: "line_item",
    amount: input.amount,
    currency: "usd",
    description: null,
    quantity: input.quantity ?? 1,
    period: { start: input.start, end: input.end },
    metadata: {},
    parent: {
      type: "subscription_item_details",
      invoice_item_details: null,
      subscription_item_details: {
        invoice_item: null,
        proration: input.proration ?? false,
        proration_details: { credited_items: null },
        subscription: input.subscriptionId,
        subscription_item: input.itemId ?? id("si"),
      },
    },
    pricing: { type: "price_details", price_details: { price: id("price"), product: input.product }, unit_amount_decimal: null },
  } as unknown as Stripe.InvoiceLineItem;
}

export function invoice(input: {
  customer: string;
  subscriptionId: string;
  agencyId?: string;
  billingReason: Stripe.Invoice.BillingReason;
  lines: Stripe.InvoiceLineItem[];
  status?: "paid" | "open";
}): Stripe.Invoice {
  const total = input.lines.reduce((sum, l) => sum + l.amount, 0);
  return {
    id: id("in"),
    object: "invoice",
    customer: input.customer,
    billing_reason: input.billingReason,
    status: input.status ?? "paid",
    amount_due: total,
    amount_paid: input.status === "open" ? 0 : total,
    currency: "usd",
    parent: {
      type: "subscription_details",
      quote_details: null,
      subscription_details: { subscription: input.subscriptionId, metadata: input.agencyId ? { agency_id: input.agencyId } : {} },
    },
    lines: { object: "list", data: input.lines, has_more: false, url: "/v1/invoices/lines" },
  } as unknown as Stripe.Invoice;
}

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
