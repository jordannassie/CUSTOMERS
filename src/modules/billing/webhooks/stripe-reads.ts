import type Stripe from "stripe";
import { hasProrations, prorationPeriodStarts } from "./credits";
import type { StripeReader } from "./handlers";

// Stripe reads the webhook handlers make when an event's payload is not enough.

/**
 * BUG-104: Checkout does not copy line item metadata to the subscription items, so a subscription started there has
 * items without business_id. The business comes from the session's line items, matched by price (each business
 * has its own, BUG-103), and is written onto the item once, for later plan changes.
 */
export async function withBusinessIds(stripe: StripeReader, subscriptionId: string, items: Stripe.SubscriptionItem[]) {
  if (items.every((i) => i.metadata?.business_id)) return items;
  const fromCheckout = await stripe.checkoutBusinessIds(subscriptionId);
  const found = new Map(items.flatMap((i) => (i.metadata?.business_id ? [] : fromCheckout.has(i.price.id) ? [[i.id, fromCheckout.get(i.price.id)!] as const] : [])));
  // An item whose plan changed since checkout has a new price: when one item and one checkout business are left,
  // they belong together (BUG-121).
  const left = items.filter((i) => !i.metadata?.business_id && !found.has(i.id));
  const used = new Set([...items.map((i) => i.metadata?.business_id), ...found.values()]);
  const unused = [...new Set(fromCheckout.values())].filter((id) => !used.has(id));
  if (left.length === 1 && unused.length === 1) found.set(left[0].id, unused[0]);
  return Promise.all(
    items.map(async (item) => {
      const businessId = found.get(item.id);
      if (!businessId) return item;
      await stripe.tagItem(item.id, businessId);
      return { ...item, metadata: { ...item.metadata, business_id: businessId } };
    }),
  );
}

/**
 * For prorations: the billing period start of each prorated item, read from Stripe, since a month before the end is
 * wrong for billing days 29 to 31. Empty when it can't be read, and the grants then work the start out from the end.
 */
export async function periodStartsFor(
  stripe: StripeReader,
  subscriptionId: string | null,
  invoiceId: string | undefined,
  lines: Stripe.InvoiceLineItem[],
): Promise<Map<string, number>> {
  if (!subscriptionId || !hasProrations(lines)) return new Map<string, number>();
  try {
    const sub = await stripe.retrieveSubscription(subscriptionId);
    const items = sub.items.has_more ? await stripe.listSubscriptionItems(sub.id) : sub.items.data;
    return prorationPeriodStarts(items, lines);
  } catch (error) {
    console.warn("[stripe/webhook] period start not read, worked out from the end", invoiceId, error instanceof Error ? error.message : String(error));
    return new Map<string, number>();
  }
}
