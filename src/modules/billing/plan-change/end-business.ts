import "server-only";
import { billingAccess } from "../account/access";
import { loadPlanChangeData } from "./dal";
import type Stripe from "stripe";
import type { PlanChangeStripe } from "./client";
import { isCancelling, itemFor, periodEnd, PlanChangeError, scheduleIdOf, type BusinessRow, type PlanChange } from "./planner";
import { withoutBusiness } from "./trial-removal";
import { applyPlanChange } from "./service";
import { isMissingInStripe } from "../stripe-missing";

// Deleting a business (B-77, MVP_SPEC 23): its plan item goes at the end of the billing period, with no refund
// (11.5). When it is the only business on the plan, the whole plan ends then instead, since Stripe needs one item.
// During a trial nothing has been paid for it, so it comes off the plan at once and the trial end bills it nothing
// (2026-10-15).

/** `removedNow`: it left a trial plan at once, so it is never charged. */
export type BusinessPlanEnd = { endsAt: string | null; removedNow?: boolean };

export async function endBusinessPlan(agencyId: string, businessId: string, now = new Date()): Promise<BusinessPlanEnd> {
  const data = await loadPlanChangeData(agencyId);
  if (!data.context.businesses.some((b) => b.id === businessId)) throw new PlanChangeError(404, "Business not found.");
  if (!data.context.subscriptionId) return { endsAt: null };

  const access = await billingAccess(data);
  if (!access) {
    throw new PlanChangeError(503, "We couldn't reach our payment provider, so nothing was deleted. Try again in a minute.");
  }
  let sub;
  try {
    sub = await access.stripe.retrieveSubscription(data.context.subscriptionId);
  } catch (error) {
    // Stripe has no such subscription: there is no plan to end, so the business can go (2026-10-14).
    if (!isMissingInStripe(error)) throw error;
    console.warn("[billing] subscription not in Stripe, nothing to end:", data.context.subscriptionId);
    return { endsAt: null };
  }
  if (sub.status === "canceled" || sub.status === "incomplete_expired") return { endsAt: null };
  const business = access.context.businesses.find((b) => b.id === businessId)!;
  if (!itemFor(sub, business)) return { endsAt: null };

  const endsAt = new Date(periodEnd(sub) * 1000).toISOString();
  if (isCancelling(sub)) return { endsAt };

  if (sub.status === "trialing" && sub.items.data.length > 1) {
    await removeFromTrialNow(access.stripe, sub, business, now);
    return { endsAt: null, removedNow: true };
  }

  const change: PlanChange = sub.items.data.length <= 1 ? { kind: "cancel" } : { kind: "remove", businessId };
  const deps = { stripe: access.stripe, plansByProduct: data.plansByProduct, now: () => now };
  await applyPlanChange(access.context, change, Math.floor(now.getTime() / 1000), deps);
  return { endsAt };
}

/** Takes the item off now with no proration; a schedule, when there is one, drops it from every phase. */
async function removeFromTrialNow(stripe: PlanChangeStripe, sub: Stripe.Subscription, business: BusinessRow, now: Date) {
  const key = `trial-remove:${business.id}:${Math.floor(now.getTime() / 1000)}`;
  const scheduleId = scheduleIdOf(sub);
  const schedule = scheduleId ? await stripe.retrieveSchedule(scheduleId) : null;
  if (schedule && schedule.status === "active") {
    await stripe.updateSchedule(schedule.id, withoutBusiness(sub, schedule, business.id), key);
    return;
  }
  await stripe.updateSubscription(sub.id, { items: [{ id: itemFor(sub, business)!.id, deleted: true }], proration_behavior: "none" }, key);
}
