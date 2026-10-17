import type Stripe from "stripe";
import { itemSpec, phasesOf } from "./planner";

/**
 * A4: Stripe refuses a new trial end on a subscription a schedule controls (a pending downgrade or removal), so the
 * trial moves through the schedule: the current phase runs to the new trial end, and the pending phase starts then.
 */
export function trialExtendedPhases(schedule: Stripe.SubscriptionSchedule, trialEnd: number): Stripe.SubscriptionScheduleUpdateParams.Phase[] {
  const { current, next } = phasesOf(schedule);
  const phases: Stripe.SubscriptionScheduleUpdateParams.Phase[] = [
    { items: current.items.map(itemSpec), start_date: current.start_date, end_date: Math.max(current.end_date, trialEnd), trial_end: trialEnd },
  ];
  if (next) phases.push({ items: next.items.map(itemSpec), duration: { interval: "month", interval_count: 1 }, proration_behavior: "none" });
  return phases;
}
