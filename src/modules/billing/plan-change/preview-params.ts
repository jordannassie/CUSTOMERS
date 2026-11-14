import type Stripe from "stripe";
import { buildPhases, isTrialing, itemSpec, phasesOf, previewItemsFor, timingOf, type CheckedChange } from "./planner";

// The schedule phases a change writes, and the invoice preview that prices it.

export function schedulePhases(sub: Stripe.Subscription, schedule: Stripe.SubscriptionSchedule, checked: CheckedChange) {
  const { current, next } = phasesOf(schedule);
  return buildPhases(
    sub,
    { start: current.start_date, end: current.end_date, items: current.items.map(itemSpec) },
    next ? next.items.map(itemSpec) : null,
    checked,
  );
}

export function previewParams(
  { sub, schedule }: { sub: Stripe.Subscription; schedule: Stripe.SubscriptionSchedule | null },
  checked: CheckedChange,
  prorationDate: number,
): Stripe.InvoiceCreatePreviewParams | null {
  const kind = checked.change.kind;
  if (kind === "cancel" || kind === "keep" || kind === "keepBusiness") return null;
  const proration_behavior = timingOf(kind, isTrialing(sub)) === "now" ? "always_invoice" : "none";
  if (schedule) {
    return { schedule: schedule.id, schedule_details: { phases: schedulePhases(sub, schedule, checked), proration_behavior } };
  }
  return {
    subscription: sub.id,
    subscription_details: {
      items: previewItemsFor(checked),
      proration_behavior,
      ...(proration_behavior === "always_invoice" ? { proration_date: prorationDate } : {}),
    },
  };
}
