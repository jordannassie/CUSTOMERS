import { randomBytes } from "node:crypto";
import type Stripe from "stripe";

// Invoice and line objects in the 2026-08-26.dahlia shapes, for the in-memory Stripe (fixtures) and tests.

const id = (prefix: string) => `${prefix}_test${randomBytes(8).toString("hex")}`;

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
