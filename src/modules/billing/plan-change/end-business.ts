import "server-only";
import { billingAccess } from "../account/access";
import { loadPlanChangeData } from "./dal";
import { itemFor, periodEnd, PlanChangeError, type PlanChange } from "./planner";
import { applyPlanChange } from "./service";

// Deleting a business (B-77, MVP_SPEC 23): its plan item goes at the end of the billing period, with no refund
// (11.5). When it is the only business on the plan, the whole plan ends then instead, since Stripe needs one item.

export type BusinessPlanEnd = { endsAt: string | null };

export async function endBusinessPlan(agencyId: string, businessId: string, now = new Date()): Promise<BusinessPlanEnd> {
  const data = await loadPlanChangeData(agencyId);
  if (!data.context.businesses.some((b) => b.id === businessId)) throw new PlanChangeError(404, "Business not found.");
  if (!data.context.subscriptionId) return { endsAt: null };

  const access = await billingAccess(data);
  if (!access) {
    throw new PlanChangeError(503, "We couldn't reach our payment provider, so nothing was deleted. Try again in a minute.");
  }
  const sub = await access.stripe.retrieveSubscription(data.context.subscriptionId);
  if (sub.status === "canceled" || sub.status === "incomplete_expired") return { endsAt: null };
  const business = access.context.businesses.find((b) => b.id === businessId)!;
  if (!itemFor(sub, business)) return { endsAt: null };

  const endsAt = new Date(periodEnd(sub) * 1000).toISOString();
  if (sub.cancel_at_period_end) return { endsAt };

  const change: PlanChange = sub.items.data.length <= 1 ? { kind: "cancel" } : { kind: "remove", businessId };
  const deps = { stripe: access.stripe, plansByProduct: data.plansByProduct, now: () => now };
  await applyPlanChange(access.context, change, Math.floor(now.getTime() / 1000), deps);
  return { endsAt };
}
