import type Stripe from "stripe";
import { PRICES } from "./fake-stripe.test-helpers";
import type { ItemSpec } from "./planner";

// The Stripe-shaped objects the in-memory Stripe hands out.

export type Item = { id: string; price: string; quantity: number; metadata: Record<string, string>; start: number; end: number };
export type Phase = { start: number; end: number; items: ItemSpec[] };
export type FakeSchedule = { id: string; status: Stripe.SubscriptionSchedule.Status; phases: Phase[]; endBehavior: string };

type SubscriptionState = {
  subscriptionId: string;
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
    customer: "cus_fake",
    status: s.status,
    trial_end: s.trialEnd,
    cancel_at_period_end: s.cancelAtPeriodEnd,
    schedule: s.schedule && s.schedule.status === "active" ? s.schedule.id : null,
    metadata: {},
    items: {
      object: "list",
      has_more: false,
      url: "",
      data: s.items.map((i) => ({
        id: i.id,
        object: "subscription_item",
        price: { id: i.price, product: PRICES[i.price].product, unit_amount: PRICES[i.price].unitAmount },
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
