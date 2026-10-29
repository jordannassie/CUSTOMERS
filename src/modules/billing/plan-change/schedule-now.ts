import type Stripe from "stripe";
import type { PlanChangeStripe } from "./client";
import { currentItems, itemSpec, phasesOf, subscriptionItemsFor, type CheckedChange, type ItemSpec, type PlanChangeContext } from "./planner";

// An add or upgrade made now on a paid subscription with a pending change (a scheduled downgrade or removal).
// A schedule update has no payment_behavior, so a declined card would still apply the change and leave the account
// past due. Instead the schedule is released, the change is made like any other (error_if_incomplete, so a decline
// changes nothing), and the schedule is made again with the pending change. On a decline the old schedule is put
// back as it was. During a trial nothing is charged, so trialing subscriptions keep editing the schedule.

type Phases = Stripe.SubscriptionScheduleUpdateParams.Phase[];

const bidOf = (i: ItemSpec) => i.metadata.business_id;

/** The current phase and the pending one. `trialEnd` keeps a trial running on the current phase (end-trial/service.ts). */
export function phasesFrom(start: number, end: number, current: ItemSpec[], next: ItemSpec[] | null, trialEnd?: number): Phases {
  const phases: Phases = [{ items: current, start_date: start, end_date: end, ...(trialEnd ? { trial_end: trialEnd } : {}) }];
  if (next) phases.push({ items: next, duration: { interval: "month", interval_count: 1 }, proration_behavior: "none" });
  return phases;
}

/** The pending items with the changed business on the price it has now, so nothing shows as scheduled for it. */
export function nextWithChange(next: ItemSpec[], now: ItemSpec[], businessId: string): ItemSpec[] {
  const mine = now.find((i) => bidOf(i) === businessId);
  if (!mine) return next;
  return next.some((i) => bidOf(i) === businessId) ? next.map((i) => (bidOf(i) === businessId ? mine : i)) : [...next, mine];
}

/**
 * Makes the schedule again from the subscription, trying once more on a failure. A schedule made on the first try is
 * reused, since Stripe allows one per subscription. False when both tries failed.
 */
export async function scheduleAgain(
  stripe: PlanChangeStripe,
  subscriptionId: string,
  key: string,
  endBehavior: Stripe.SubscriptionScheduleUpdateParams.EndBehavior,
  phases: (start: number, end: number) => Phases,
): Promise<boolean> {
  let created: Stripe.SubscriptionSchedule | null = null;
  for (const attempt of [key, `${key}:retry`]) {
    try {
      created ??= await stripe.createScheduleFromSubscription(subscriptionId, `${attempt}:create`);
      const first = created.phases[0];
      await stripe.updateSchedule(created.id, { end_behavior: endBehavior, phases: phases(first.start_date, first.end_date) }, `${attempt}:schedule`);
      return true;
    } catch (error) {
      console.error("[billing/plan-change] could not schedule the pending change again", subscriptionId, error instanceof Error ? error.message : String(error));
    }
  }
  return false;
}

export async function changeNowAroundSchedule(input: {
  stripe: PlanChangeStripe;
  ctx: PlanChangeContext;
  sub: Stripe.Subscription;
  schedule: Stripe.SubscriptionSchedule;
  checked: CheckedChange;
  previewedAt: number;
  key: string;
  /**
   * Called when the pending change could not be put back after two tries, so an admin restores it in Stripe. The
   * charge itself stands either way: the user is never told a paid change failed.
   */
  onScheduleLost?: (message: string) => Promise<void>;
}): Promise<void> {
  const { stripe, ctx, sub, schedule, checked, previewedAt, key, onScheduleLost } = input;
  const { current, next } = phasesOf(schedule);
  const before = { current: current.items.map(itemSpec), next: next ? next.items.map(itemSpec) : null };
  const lost = async (what: string) => {
    const staying = before.next?.map((i) => i.metadata.business_id).join(", ") || "none";
    const message = `A scheduled plan change on Stripe subscription ${sub.id} (agency ${ctx.agencyId}) was lost ${what}. Put it back in Stripe: at renewal only these businesses stay on the plan: ${staying}.`;
    await onScheduleLost?.(message).catch((error) => console.error("[billing/plan-change] could not raise the alert", error));
  };

  await stripe.releaseSchedule(schedule.id, `${key}:release`);
  let updated: Stripe.Subscription;
  try {
    updated = await stripe.updateSubscription(
      sub.id,
      {
        items: subscriptionItemsFor(checked),
        proration_behavior: "always_invoice",
        proration_date: previewedAt,
        payment_behavior: "error_if_incomplete",
      },
      `${key}:subscription`,
    );
  } catch (error) {
    // Nothing changed on the subscription: the pending change goes back exactly as it was.
    const restored = await scheduleAgain(stripe, sub.id, `${key}:restore`, schedule.end_behavior, (start, end) =>
      phasesFrom(start, end, before.current, before.next),
    );
    if (!restored) await lost("after a declined card");
    throw error;
  }
  if (!before.next) return;
  const now = currentItems(ctx, updated);
  const rescheduled = await scheduleAgain(stripe, sub.id, key, "release", (start, end) =>
    phasesFrom(start, end, now, nextWithChange(before.next!, now, checked.business!.id)),
  );
  if (!rescheduled) await lost("after a paid change");
}
