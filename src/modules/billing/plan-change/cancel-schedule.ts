import type Stripe from "stripe";
import { planIdOfPrice } from "../plan-price";
import { itemSpec, phasesOf, type ItemSpec, type PlanRow } from "./planner";

// Cancel and "Keep my plan" when a downgrade or removal is scheduled (BUG-124, D-57). Stripe refuses
// cancel_at_period_end on a subscription a schedule controls, so the schedule ends the plan instead: it keeps only
// its current phase and ends with `end_behavior: "cancel"` (Stripe then sets the subscription's cancel_at). The
// dropped next phase is saved in the schedule's own metadata, so keeping the plan puts it back exactly, price IDs
// included. Each step is one schedule update: nothing half done if Stripe fails between calls.

const KEY = "cd_kept_phase_";
// Stripe allows 500 characters per metadata value, so a long phase is split over numbered keys.
const MAX_VALUE = 500;

/** One saved phase item: business, price, quantity and the plan it belongs to (for the sentences). */
type KeptItem = [businessId: string, price: string, quantity: number, planId: string];

/** A change the schedule holds for one business: a new plan, or coming off the plan (planId null). */
export type ScheduledChange = { businessId: string; planId: string | null };

const idOf = (ref: string | { id: string }) => (typeof ref === "string" ? ref : ref.id);

function trialEndOf(sub: Stripe.Subscription) {
  return sub.status === "trialing" && sub.trial_end ? { trial_end: sub.trial_end } : {};
}

function currentPhase(sub: Stripe.Subscription, current: Stripe.SubscriptionSchedule.Phase) {
  return { items: current.items.map(itemSpec), start_date: current.start_date, end_date: current.end_date, ...trialEndOf(sub) };
}

/** Our saved-phase keys, each set to "" so Stripe removes them. */
function cleared(schedule: Stripe.SubscriptionSchedule): Record<string, string> {
  return Object.fromEntries(Object.keys(schedule.metadata ?? {}).filter((k) => k.startsWith(KEY)).map((k) => [k, ""]));
}

function saved(items: KeptItem[]): Record<string, string> {
  if (items.length === 0) return {};
  const json = JSON.stringify(items);
  const out: Record<string, string> = {};
  for (let i = 0; i * MAX_VALUE < json.length; i++) out[`${KEY}${i}`] = json.slice(i * MAX_VALUE, (i + 1) * MAX_VALUE);
  return out;
}

function savedItems(schedule: Stripe.SubscriptionSchedule): KeptItem[] | null {
  const metadata = schedule.metadata ?? {};
  let json = "";
  for (let i = 0; metadata[`${KEY}${i}`]; i++) json += metadata[`${KEY}${i}`];
  if (!json) return null;
  try {
    const items = JSON.parse(json) as unknown;
    return Array.isArray(items) && items.length > 0 ? (items as KeptItem[]) : null;
  } catch {
    // A broken value is never guessed at: the plan is kept with nothing scheduled.
    console.error("[billing/plan-change] saved phase on schedule could not be read", schedule.id);
    return null;
  }
}

function keptOf(item: Stripe.SubscriptionSchedule.Phase.Item, plans: PlanRow[]): KeptItem {
  return [item.metadata?.business_id ?? "", idOf(item.price), item.quantity ?? 1, planIdOfPrice(item.price, plans) ?? ""];
}

function changesBetween(now: ItemSpec[], later: KeptItem[]): ScheduledChange[] {
  const changes: ScheduledChange[] = [];
  for (const item of now) {
    const businessId = item.metadata.business_id;
    if (!businessId) continue;
    const next = later.find(([id]) => id === businessId);
    if (!next) changes.push({ businessId, planId: null });
    else if (next[1] !== item.price) changes.push({ businessId, planId: next[3] || "" });
  }
  return changes;
}

/** The schedule update for a cancel: only the current phase, then the plan ends. The next phase is saved. */
export function cancelScheduleParams(
  sub: Stripe.Subscription,
  schedule: Stripe.SubscriptionSchedule,
  plans: PlanRow[],
): Stripe.SubscriptionScheduleUpdateParams {
  const { current, next } = phasesOf(schedule);
  return {
    end_behavior: "cancel",
    phases: [currentPhase(sub, current)],
    metadata: { ...cleared(schedule), ...saved(next ? next.items.map((i) => keptOf(i, plans)) : []) },
  };
}

/** The schedule update for "Keep my plan": the saved phase goes back, and the schedule releases the plan again. */
export function keepScheduleParams(sub: Stripe.Subscription, schedule: Stripe.SubscriptionSchedule): Stripe.SubscriptionScheduleUpdateParams {
  const { current } = phasesOf(schedule);
  const kept = savedItems(schedule);
  const phases: Stripe.SubscriptionScheduleUpdateParams.Phase[] = [currentPhase(sub, current)];
  if (kept) {
    phases.push({
      items: kept.map(([businessId, price, quantity]) => ({ price, quantity, metadata: { business_id: businessId } })),
      duration: { interval: "month", interval_count: 1 },
      proration_behavior: "none",
    });
  }
  return { end_behavior: "release", phases, metadata: cleared(schedule) };
}

/** What a cancel would drop: the changes the active schedule holds now. */
export function changesDroppedByCancel(schedule: Stripe.SubscriptionSchedule | null, plans: PlanRow[]): ScheduledChange[] {
  if (!schedule) return [];
  const { current, next } = phasesOf(schedule);
  return next ? changesBetween(current.items.map(itemSpec), next.items.map((i) => keptOf(i, plans))) : [];
}

/** What "Keep my plan" would put back: the changes saved on a schedule that is ending the plan. */
export function changesRestoredByKeep(schedule: Stripe.SubscriptionSchedule | null): ScheduledChange[] {
  if (!schedule) return [];
  const kept = savedItems(schedule);
  return kept ? changesBetween(phasesOf(schedule).current.items.map(itemSpec), kept) : [];
}
