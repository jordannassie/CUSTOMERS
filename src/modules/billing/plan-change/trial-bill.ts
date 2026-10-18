import type Stripe from "stripe";
import { applyToItems, currentItems, itemSpec, phasesOf, type CheckedChange, type ItemSpec, type PlanChangeContext } from "./planner";

// BUG-245: during a trial Stripe's preview of a change is the trial's own $0 invoice, so "Your next bill will be $0"
// showed next to Billing's real next charge. The first bill is worked out here instead: every business on the plan
// when the trial ends, at its plan's price, after this change. Pure, so it is unit tested.

/** The first bill after the trial, in cents, once this change is made. Before tax and discounts, like the prices. */
export function trialBillCents(
  ctx: PlanChangeContext,
  sub: Stripe.Subscription,
  schedule: Stripe.SubscriptionSchedule | null,
  checked: CheckedChange,
): number {
  // A pending change (a business coming off) starts when the trial ends, so the first bill follows the next phase.
  const next = schedule ? phasesOf(schedule).next : null;
  const base = next ? next.items.map(itemSpec) : currentItems(ctx, sub);
  const known = new Map(sub.items.data.map((i) => [i.price.id, i.price.unit_amount]));
  return applyToItems(base, checked).reduce((sum, item) => sum + unitAmount(ctx, item, known) * item.quantity, 0);
}

function unitAmount(ctx: PlanChangeContext, item: ItemSpec, known: Map<string, number | null>): number {
  if (item.price_data) return item.price_data.unit_amount;
  const amount = item.price ? known.get(item.price) : null;
  if (amount != null) return amount;
  // A price only the schedule names: the business's plan price.
  const business = ctx.businesses.find((b) => b.id === item.metadata.business_id);
  return ctx.plans.find((p) => p.id === business?.planId)?.priceCents ?? 0;
}
