import type Stripe from "stripe";
import { invoice, line } from "../stripe-objects";
import type { ItemSpec } from "./planner";

// The Stripe-shaped objects the in-memory Stripe hands out, and its prices and dates.

export type PriceTable = Record<string, { product: string; unitAmount: number }>;

export const PRICES: PriceTable = {
  price_starter: { product: "cd_plan_starter", unitAmount: 14900 },
  price_pro: { product: "cd_plan_pro", unitAmount: 24900 },
};

export const at = (iso: string) => Math.floor(Date.parse(iso) / 1000);

export function monthAfter(seconds: number): number {
  const d = new Date(seconds * 1000);
  return Math.floor(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()) / 1000);
}

export type Item = { id: string; price: string; quantity: number; metadata: Record<string, string>; start: number; end: number };
/** An item spec after its price_data became a price, as Stripe stores it. */
export type Priced = ItemSpec & { price: string };
export type Phase = { start: number; end: number; items: Priced[] };
export type FakeSchedule = {
  id: string;
  status: Stripe.SubscriptionSchedule.Status;
  phases: Phase[];
  endBehavior: string;
  metadata?: Record<string, string>;
};

type SubscriptionState = {
  subscriptionId: string;
  customerId: string;
  agencyId: string | null;
  prices: PriceTable;
  status: Stripe.Subscription.Status;
  trialEnd: number | null;
  cancelAtPeriodEnd: boolean;
  schedule: FakeSchedule | null;
  items: Item[];
};

/** Like Stripe: set by cancel_at_period_end, or by a schedule that ends the plan (BUG-124). */
function cancelAtOf(s: SubscriptionState): number | null {
  if (s.cancelAtPeriodEnd) return Math.min(...s.items.map((i) => i.end));
  if (s.schedule?.status !== "active" || s.schedule.endBehavior !== "cancel") return null;
  return Math.max(...s.schedule.phases.map((p) => p.end));
}

/** A schedule that ends with "cancel" ends the plan after its last phase, with no further bill (BUG-124). Marks it completed. */
export function endsPlan(schedule: FakeSchedule | null, boundary: number): boolean {
  if (schedule?.status !== "active" || schedule.endBehavior !== "cancel" || schedule.phases.some((p) => p.end > boundary)) return false;
  schedule.status = "completed";
  return true;
}

/** Like Stripe: a plan set to end has no next bill to preview. */
export const noUpcomingInvoice = () =>
  Object.assign(new Error("No upcoming invoices"), { type: "StripeInvalidRequestError", code: "invoice_upcoming_none", statusCode: 404 });

/** Stripe merges metadata on update, and an empty value removes the key. */
export function mergedMetadata(before: Record<string, string> = {}, update: Stripe.Emptyable<Stripe.MetadataParam> | undefined): Record<string, string> {
  const merged = { ...before };
  for (const [key, value] of Object.entries(update || {})) {
    if (value === "" || value === null || value === undefined) delete merged[key];
    else merged[key] = String(value);
  }
  return merged;
}

export function subscriptionObject(s: SubscriptionState): Stripe.Subscription {
  return {
    id: s.subscriptionId,
    object: "subscription",
    customer: s.customerId,
    status: s.status,
    trial_end: s.trialEnd,
    cancel_at_period_end: s.cancelAtPeriodEnd,
    cancel_at: cancelAtOf(s),
    schedule: s.schedule && s.schedule.status === "active" ? s.schedule.id : null,
    metadata: s.agencyId ? { agency_id: s.agencyId } : {},
    items: {
      object: "list",
      has_more: false,
      url: "",
      data: s.items.map((i) => ({
        id: i.id,
        object: "subscription_item",
        price: { id: i.price, product: s.prices[i.price].product, unit_amount: s.prices[i.price].unitAmount },
        quantity: i.quantity,
        metadata: { ...i.metadata },
        current_period_start: i.start,
        current_period_end: i.end,
      })),
    },
  } as unknown as Stripe.Subscription;
}

export function scheduleObject(s: FakeSchedule, clock: number, prices: PriceTable): Stripe.SubscriptionSchedule {
  const current = s.phases.find((p) => p.start <= clock && clock < p.end) ?? s.phases[0];
  return {
    id: s.id,
    object: "subscription_schedule",
    status: s.status,
    end_behavior: s.endBehavior,
    metadata: { ...(s.metadata ?? {}) },
    current_phase: { start_date: current.start, end_date: current.end },
    phases: s.phases.map((p) => ({
      start_date: p.start,
      end_date: p.end,
      // Expanded like the real client asks for (phases.items.price).
      items: p.items.map((i) => ({
        price: { id: i.price, product: prices[i.price].product, unit_amount: prices[i.price].unitAmount },
        quantity: i.quantity,
        metadata: { ...i.metadata },
      })),
    })),
  } as unknown as Stripe.SubscriptionSchedule;
}

/** Proration lines for moving from `from` to `to` at `date`: credit for unused time, charge for the rest. */
export function prorationLines(
  s: Pick<SubscriptionState, "items" | "prices" | "subscriptionId">,
  from: Priced[],
  to: Priced[],
  date: number,
): Stripe.InvoiceLineItem[] {
  const start = Math.min(...s.items.map((i) => i.start));
  const end = Math.min(...s.items.map((i) => i.end));
  const fraction = (end - date) / (end - start);
  const lines: Stripe.InvoiceLineItem[] = [];
  const key = (i: Priced) => i.metadata.business_id;
  const push = (spec: Priced, sign: 1 | -1, itemId: string) =>
    lines.push(
      line({
        product: s.prices[spec.price].product,
        amount: sign * Math.round(s.prices[spec.price].unitAmount * fraction),
        proration: true,
        itemId,
        subscriptionId: s.subscriptionId,
        start: date,
        end,
      }),
    );
  for (const next of to) {
    const before = from.find((f) => key(f) === key(next));
    const itemId = s.items.find((i) => i.metadata.business_id === key(next))?.id ?? `si_${key(next)}`;
    if (before && before.price === next.price) continue;
    if (before) push(before, -1, itemId);
    push(next, 1, itemId);
  }
  return lines;
}

/** Real Stripe refuses one price on two items of a subscription (BUG-103); the fake did not, so no test caught it. */
export function uniquePrices(items: Priced[]): Priced[] {
  const prices = items.map((i) => i.price);
  if (new Set(prices).size !== prices.length) {
    throw Object.assign(new Error("Duplicate entry for recurring price"), { type: "StripeInvalidRequestError", statusCode: 400 });
  }
  return items;
}

/** A real subscription never has one price twice (BUG-103): a second business seeded on a plan gets its own price. */
export function seededPrices(prices: PriceTable): (price: string) => string {
  const used = new Set<string>();
  return (price) => {
    if (!used.has(price)) return used.add(price), price;
    const copy = `${price}_${used.size}`;
    prices[copy] = { ...prices[price] };
    return used.add(copy), copy;
  };
}

/** Like Stripe, a `price_data` item gets a new price of its own, so two businesses on one plan never share one. */
export function pricedSpec(spec: ItemSpec | Stripe.SubscriptionUpdateParams.Item, prices: PriceTable, newId: () => string): Priced {
  let price = spec.price;
  if (!price && spec.price_data) {
    price = newId();
    prices[price] = { product: spec.price_data.product as string, unitAmount: spec.price_data.unit_amount! };
  }
  if (!price) throw new Error("item has no price");
  return { price, quantity: spec.quantity ?? 1, metadata: { ...((spec.metadata ?? {}) as Record<string, string>) } };
}

/** The renewal bill for `items` for the month from `start`, still open. */
export function renewalInvoice(
  s: Pick<SubscriptionState, "customerId" | "subscriptionId" | "prices">,
  items: Priced[],
  start: number,
): Stripe.Invoice {
  const end = monthAfter(start);
  return invoice({
    customer: s.customerId,
    subscriptionId: s.subscriptionId,
    billingReason: "subscription_cycle",
    lines: items.map((i) => line({ product: s.prices[i.price].product, amount: s.prices[i.price].unitAmount, subscriptionId: s.subscriptionId, start, end })),
    status: "open",
  });
}
