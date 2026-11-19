import type Stripe from "stripe";
import { itemSpec, phasesOf } from "./planner";

// A business deleted during a trial leaves the plan at once (2026-10-15). Pure, so the phases are unit tested.

/**
 * The schedule update that takes one business out of every phase, so it is neither on the plan now nor at renewal.
 * When every other business was already coming off, nothing is left for the next phase, so the plan ends at the trial
 * end as the schedule already said it would.
 */
export function withoutBusiness(
  sub: Stripe.Subscription,
  schedule: Stripe.SubscriptionSchedule,
  businessId: string,
): Stripe.SubscriptionScheduleUpdateParams {
  const { current, next } = phasesOf(schedule);
  const others = (items: Stripe.SubscriptionSchedule.Phase.Item[]) =>
    items.filter((i) => i.metadata?.business_id !== businessId).map(itemSpec);
  const trialEnd = sub.status === "trialing" && sub.trial_end ? { trial_end: sub.trial_end } : {};
  const phases: Stripe.SubscriptionScheduleUpdateParams.Phase[] = [
    { items: others(current.items), start_date: current.start_date, end_date: current.end_date, ...trialEnd },
  ];
  const later = next ? others(next.items) : [];
  if (later.length > 0) phases.push({ items: later, duration: { interval: "month", interval_count: 1 }, proration_behavior: "none" });
  return { phases, proration_behavior: "none", ...(next && later.length === 0 ? { end_behavior: "cancel" as const } : {}) };
}
