import type Stripe from "stripe";
import { line } from "../stripe-objects";
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
export type Phase = { start: number; end: number; items: ItemSpec[] };
export type FakeSchedule = { id: string; status: Stripe.SubscriptionSchedule.Status; phases: Phase[]; endBehavior: string };

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

export function subscriptionObject(s: SubscriptionState): Stripe.Subscription {
  return {
    id: s.subscriptionId,
    object: "subscription",
    customer: s.customerId,
    status: s.status,
    trial_end: s.trialEnd,
    cancel_at_period_end: s.cancelAtPeriodEnd,
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

export function scheduleObject(s: FakeSchedule, clock: number): Stripe.SubscriptionSchedule {
  const current = s.phases.find((p) => p.start <= clock && clock < p.end) ?? s.phases[0];
  return {
    id: s.id,
    object: "subscription_schedule",
    status: s.status,
    end_behavior: s.endBehavior,
    current_phase: { start_date: current.start, end_date: current.end },
    phases: s.phases.map((p) => ({
      start_date: p.start,
      end_date: p.end,
      items: p.items.map((i) => ({ price: i.price, quantity: i.quantity, metadata: { ...i.metadata } })),
    })),
  } as unknown as Stripe.SubscriptionSchedule;
}

/** Proration lines for moving from `from` to `to` at `date`: credit for unused time, charge for the rest. */
export function prorationLines(
  s: Pick<SubscriptionState, "items" | "prices" | "subscriptionId">,
  from: ItemSpec[],
  to: ItemSpec[],
  date: number,
): Stripe.InvoiceLineItem[] {
  const start = Math.min(...s.items.map((i) => i.start));
  const end = Math.min(...s.items.map((i) => i.end));
  const fraction = (end - date) / (end - start);
  const lines: Stripe.InvoiceLineItem[] = [];
  const key = (i: ItemSpec) => i.metadata.business_id;
  const push = (spec: ItemSpec, sign: 1 | -1, itemId: string) =>
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
