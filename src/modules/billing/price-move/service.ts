import type Stripe from "stripe";
import { isCancelling, itemSpec, periodEnd, phasesOf, scheduleIdOf, type ItemSpec } from "../plan-change/planner";
import { planIdOfPrice, planPriceData } from "../plan-price";

// Pure: moving a subscription to the plans' current prices at its next renewal (D-93). A price change in the plans
// table reaches existing customers here: each item still on an old amount gets a new price at the plan's amount, with
// no proration, so nothing is charged now and the next renewal bills the new price. No env or DB imports.

export type MovePlan = { id: string; priceCents: number };
/** Businesses on the subscription, from the database: the item link and whether the business was deleted. */
export type MoveBusiness = { id: string; itemId: string | null; deleted: boolean };

/** One business whose renewal price changes. */
export type PriceMove = { businessId: string; planId: string; fromCents: number; toCents: number };

export type MoveUpdate =
  | { kind: "subscription"; items: Stripe.SubscriptionUpdateParams.Item[] }
  | { kind: "schedule"; scheduleId: string; phases: Stripe.SubscriptionScheduleUpdateParams.Phase[] };

export type PriceMovePlan = {
  moves: PriceMove[];
  /** The Stripe write that makes the moves; null when every item is on its plan's price already. */
  update: MoveUpdate | null;
  /** When the new prices are first charged: the renewal, or the trial end during a trial (unix seconds). */
  startsAt: number;
  /** What each current item costs after the update, for business_subscriptions.price_cents. */
  prices: { itemId: string; cents: number }[];
};

/** Subscriptions that renew: the ones a new price can still reach. */
const RENEWING = new Set(["active", "trialing", "past_due"]);

type PriceRef = Stripe.Price | string | null | undefined;
const amountOf = (price: PriceRef) => (price && typeof price !== "string" ? price.unit_amount : null);

function planOf(price: PriceRef, plans: MovePlan[]): MovePlan | null {
  const id = planIdOfPrice(price, plans);
  return plans.find((p) => p.id === id) ?? null;
}

/** The item at its plan's current price, keeping its quantity and business. Null when it is on that price already. */
function repriced(spec: ItemSpec, price: PriceRef, plans: MovePlan[]): ItemSpec | null {
  const plan = planOf(price, plans);
  const amount = amountOf(price);
  if (!plan || amount === null || amount === plan.priceCents) return null;
  return { price_data: planPriceData(plan), quantity: spec.quantity, metadata: spec.metadata };
}

const empty = (sub: Stripe.Subscription): PriceMovePlan => ({ moves: [], update: null, startsAt: periodEnd(sub), prices: currentPrices(sub, []) });

function currentPrices(sub: Stripe.Subscription, moved: { itemId: string; cents: number }[]): PriceMovePlan["prices"] {
  const after = new Map(moved.map((m) => [m.itemId, m.cents]));
  return sub.items.data.flatMap((i) => {
    const cents = after.get(i.id) ?? i.price.unit_amount;
    return cents == null ? [] : [{ itemId: i.id, cents }];
  });
}

/**
 * What moving this subscription to the current plan prices takes. Nothing for a subscription that will not renew
 * (cancelled, ending, unpaid) or a business that was deleted (its item runs out at the period end).
 */
export function planPriceMoves(input: {
  sub: Stripe.Subscription;
  /** The subscription's schedule with phase prices expanded, when it has one (a pending downgrade or removal). */
  schedule: Stripe.SubscriptionSchedule | null;
  plans: MovePlan[];
  businesses: MoveBusiness[];
}): PriceMovePlan {
  const { sub, schedule, plans, businesses } = input;
  if (!RENEWING.has(sub.status) || isCancelling(sub)) return empty(sub);
  const deleted = new Set(businesses.filter((b) => b.deleted).map((b) => b.id));
  const businessOf = (item: Stripe.SubscriptionItem) =>
    item.metadata?.business_id || businesses.find((b) => b.itemId === item.id)?.id || null;

  if (!schedule || !scheduleIdOf(sub)) {
    const moves: PriceMove[] = [];
    const items: Stripe.SubscriptionUpdateParams.Item[] = [];
    const moved: { itemId: string; cents: number }[] = [];
    for (const item of sub.items.data) {
      const businessId = businessOf(item);
      const plan = planOf(item.price, plans);
      const from = item.price.unit_amount;
      if (!businessId || deleted.has(businessId) || !plan || from == null || from === plan.priceCents) continue;
      moves.push({ businessId, planId: plan.id, fromCents: from, toCents: plan.priceCents });
      items.push({ id: item.id, price_data: planPriceData(plan) });
      moved.push({ itemId: item.id, cents: plan.priceCents });
    }
    return { moves, update: items.length ? { kind: "subscription", items } : null, startsAt: periodEnd(sub), prices: currentPrices(sub, moved) };
  }

  // With a schedule, the next phase is what renews: a business moving plan at the renewal moves at its new plan's
  // current price, and one coming off is left alone. An item that renews on the same plan is moved in the current
  // phase too, so Billing shows the price the renewal will charge.
  const { current, next } = phasesOf(schedule);
  const renewing = next ?? current;
  const renewPlan = new Map<string, string | null>();
  for (const item of renewing.items) {
    const id = item.metadata?.business_id;
    if (id && !deleted.has(id)) renewPlan.set(id, planOf(item.price as PriceRef, plans)?.id ?? null);
  }
  const staying = new Set(renewPlan.keys());
  const moves: PriceMove[] = [];
  const nextItems = next?.items.map((item) => {
    const spec = itemSpec(item);
    const changed = staying.has(spec.metadata.business_id ?? "") ? repriced(spec, item.price as PriceRef, plans) : null;
    return changed ?? spec;
  });
  const moved: { itemId: string; cents: number }[] = [];
  const currentItems = current.items.map((item) => {
    const spec = itemSpec(item);
    const businessId = spec.metadata.business_id;
    const samePlan = !!businessId && renewPlan.get(businessId) === (planOf(item.price as PriceRef, plans)?.id ?? undefined);
    const changed = samePlan ? repriced(spec, item.price as PriceRef, plans) : null;
    if (changed) {
      const subItem = sub.items.data.find((i) => i.metadata?.business_id === businessId);
      if (subItem) moved.push({ itemId: subItem.id, cents: changed.price_data!.unit_amount });
    }
    return changed ?? spec;
  });
  for (const item of renewing.items) {
    const businessId = item.metadata?.business_id;
    const plan = planOf(item.price as PriceRef, plans);
    const from = amountOf(item.price as PriceRef);
    if (!businessId || !staying.has(businessId) || !plan || from === null || from === plan.priceCents) continue;
    moves.push({ businessId, planId: plan.id, fromCents: from, toCents: plan.priceCents });
  }
  if (moves.length === 0 && moved.length === 0) return empty(sub);
  const trialEnd = sub.status === "trialing" && sub.trial_end ? { trial_end: sub.trial_end } : {};
  const phases: Stripe.SubscriptionScheduleUpdateParams.Phase[] = [
    { items: currentItems, start_date: current.start_date, end_date: current.end_date, ...trialEnd },
  ];
  if (nextItems) phases.push({ items: nextItems, duration: { interval: "month", interval_count: 1 }, proration_behavior: "none" });
  return { moves, update: { kind: "schedule", scheduleId: schedule.id, phases }, startsAt: periodEnd(sub), prices: currentPrices(sub, moved) };
}

/** One Stripe write per subscription and set of amounts, so a retried run changes nothing twice. */
export function priceMoveKey(subscriptionId: string, moves: PriceMove[], startsAt: number): string {
  const parts = moves.map((m) => `${m.businessId}:${m.toCents}`).sort();
  return `price-move:${subscriptionId}:${startsAt}:${parts.join(",")}`;
}
