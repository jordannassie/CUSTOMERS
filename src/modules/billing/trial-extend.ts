import "server-only";
import { scheduleIdOf } from "./plan-change/planner";
import { trialExtendedPhases } from "./plan-change/trial-phases";
import { getStripe } from "./stripe";

/**
 * Moves a trial's end in Stripe, for the admin "Extend trial" action. A subscription with a scheduled plan change is
 * controlled by its schedule, which then carries the new trial end (A4). Nothing is charged or prorated.
 */
export async function extendSubscriptionTrial(subscriptionId: string, trialEnd: Date): Promise<void> {
  const stripe = getStripe();
  const end = Math.floor(trialEnd.getTime() / 1000);
  const scheduleId = scheduleIdOf(await stripe.subscriptions.retrieve(subscriptionId));
  if (!scheduleId) {
    await stripe.subscriptions.update(subscriptionId, { trial_end: end, proration_behavior: "none" });
    return;
  }
  const schedule = await stripe.subscriptionSchedules.retrieve(scheduleId);
  await stripe.subscriptionSchedules.update(scheduleId, { phases: trialExtendedPhases(schedule, end), proration_behavior: "none" });
}
