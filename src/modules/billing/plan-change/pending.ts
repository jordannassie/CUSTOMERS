import type Stripe from "stripe";
import { samePlanPrice } from "../plan-price";
import { itemSpec, phasesOf, PlanChangeError, type ItemSpec } from "./planner";

// B1: what a pending downgrade or removal looks like on the subscription schedule, and how to take it back.

const bidOf = (i: ItemSpec) => i.metadata.business_id;
type PhaseItem = Stripe.SubscriptionSchedule.Phase.Item;
const itemOf = (items: PhaseItem[], businessId: string) => items.find((i) => i.metadata?.business_id === businessId);

export type PendingKind = "plan" | "remove";

/** What the schedule will do to one business at the next renewal; null when nothing is scheduled for it. */
export function pendingFor(schedule: Stripe.SubscriptionSchedule | null, businessId: string): PendingKind | null {
  if (!schedule) return null;
  const { current, next } = phasesOf(schedule);
  if (!next) return null;
  const mine = itemOf(current.items, businessId);
  if (!mine) return null;
  const later = itemOf(next.items, businessId);
  if (!later) return "remove";
  // Another price of the same plan is not a change (2026-10-15: "Starter, moves to Starter").
  return samePlanPrice(later.price, mine.price) ? null : "plan";
}

/** A business that is leaving the plan can only stay or go; an upgrade or downgrade would not mean anything. */
export function refuseWhileLeaving(schedule: Stripe.SubscriptionSchedule | null, businessId: string, name: string): void {
  if (pendingFor(schedule, businessId) === "remove") {
    throw new PlanChangeError(409, `${name} is coming off your plan. Keep it on the plan first, then make this change.`);
  }
}

const trialEndOf = (sub: Stripe.Subscription) => (sub.status === "trialing" && sub.trial_end ? { trial_end: sub.trial_end } : {});

/**
 * The schedule phases after one business's scheduled change is taken back: its next-phase item goes back to what it
 * is now. Null when nothing else is scheduled, so the schedule should be released and the subscription left as it is.
 */
export function phasesWithoutPending(
  sub: Stripe.Subscription,
  schedule: Stripe.SubscriptionSchedule,
  businessId: string,
  name: string,
): Stripe.SubscriptionScheduleUpdateParams.Phase[] | null {
  const kind = pendingFor(schedule, businessId);
  if (!kind) throw new PlanChangeError(409, `Nothing is scheduled to change for ${name}.`);
  const { current, next } = phasesOf(schedule);
  const now = current.items.map(itemSpec);
  const mine = now.find((i) => bidOf(i) === businessId)!;
  const later = next!.items.map(itemSpec);
  const restored = kind === "remove" ? [...later, mine] : later.map((i) => (bidOf(i) === businessId ? mine : i));

  // Prices as Stripe sent them, so two prices of one plan count as the same.
  const priceOf = new Map([...current.items, ...next!.items].map((i) => [typeof i.price === "string" ? i.price : i.price.id, i.price]));
  const unchanged =
    restored.length === now.length &&
    now.every((i) => {
      const r = restored.find((x) => bidOf(x) === bidOf(i));
      return r !== undefined && samePlanPrice(priceOf.get(r.price!) ?? r.price, priceOf.get(i.price!) ?? i.price);
    });
  if (unchanged) return null;
  return [
    { items: now, start_date: current.start_date, end_date: current.end_date, ...trialEndOf(sub) },
    { items: restored, duration: { interval: "month", interval_count: 1 }, proration_behavior: "none" },
  ];
}

/**
 * After a change made now on a schedule (an add or an upgrade), the business's item is in both phases, each with a
 * price Stripe made from the same `price_data`. Returns phases with the next phase on the current phase's price, so
 * nothing looks scheduled for it; null when the two already match.
 */
export function phasesOnOnePrice(
  sub: Stripe.Subscription,
  schedule: Stripe.SubscriptionSchedule,
  businessId: string,
): Stripe.SubscriptionScheduleUpdateParams.Phase[] | null {
  const { current, next } = phasesOf(schedule);
  if (!next) return null;
  const now = itemOf(current.items, businessId);
  const later = itemOf(next.items, businessId);
  if (!now || !later) return null;
  const price = itemSpec(now).price!;
  if (itemSpec(later).price === price) return null;
  return [
    { items: current.items.map(itemSpec), start_date: current.start_date, end_date: current.end_date, ...trialEndOf(sub) },
    {
      items: next.items.map((i) => (i === later ? { ...itemSpec(i), price } : itemSpec(i))),
      duration: { interval: "month", interval_count: 1 },
      proration_behavior: "none",
    },
  ];
}
