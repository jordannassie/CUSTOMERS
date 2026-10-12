import type Stripe from "stripe";
import { itemSpec, phasesOf, PlanChangeError, type ItemSpec } from "./planner";

// B1: what a pending downgrade or removal looks like on the subscription schedule, and how to take it back.

const bidOf = (i: ItemSpec) => i.metadata.business_id;

export type PendingKind = "plan" | "remove";

/** What the schedule will do to one business at the next renewal; null when nothing is scheduled for it. */
export function pendingFor(schedule: Stripe.SubscriptionSchedule | null, businessId: string): PendingKind | null {
  if (!schedule) return null;
  const { current, next } = phasesOf(schedule);
  if (!next) return null;
  const mine = current.items.map(itemSpec).find((i) => bidOf(i) === businessId);
  if (!mine) return null;
  const later = next.items.map(itemSpec).find((i) => bidOf(i) === businessId);
  if (!later) return "remove";
  return later.price !== mine.price ? "plan" : null;
}

/** A business that is leaving the plan can only stay or go; an upgrade or downgrade would not mean anything. */
export function refuseWhileLeaving(schedule: Stripe.SubscriptionSchedule | null, businessId: string, name: string): void {
  if (pendingFor(schedule, businessId) === "remove") {
    throw new PlanChangeError(409, `${name} is coming off your plan. Keep it on the plan first, then make this change.`);
  }
}

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

  const unchanged = restored.length === now.length && now.every((i) => restored.find((r) => bidOf(r) === bidOf(i))?.price === i.price);
  if (unchanged) return null;
  const trialEnd = sub.status === "trialing" && sub.trial_end ? { trial_end: sub.trial_end } : {};
  return [
    { items: now, start_date: current.start_date, end_date: current.end_date, ...trialEnd },
    { items: restored, duration: { interval: "month", interval_count: 1 }, proration_behavior: "none" },
  ];
}
