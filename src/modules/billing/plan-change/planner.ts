import type Stripe from "stripe";
import { planIdOfPrice, planPriceData, type PlanPriceData } from "../plan-price";

// Pure rules for plan changes (MVP_SPEC 11.5, D-57): which change is allowed, and the exact Stripe items or
// schedule phases it becomes. No database, env or Stripe calls, so every case is unit tested.

export type PlanChange =
  | { kind: "upgrade"; businessId: string; planId: string }
  | { kind: "add"; businessId: string; planId: string }
  | { kind: "downgrade"; businessId: string; planId: string }
  | { kind: "remove"; businessId: string }
  /** Takes back a scheduled downgrade or removal of one business (B1). */
  | { kind: "keepBusiness"; businessId: string }
  | { kind: "cancel" }
  | { kind: "keep" };

export type PlanRow = { id: string; name: string; priceCents: number; stripePriceId: string | null };
/** `deleted`: the business was deleted; its item may only come off the plan (BUG-120). `requestedPlanId`: chosen
 * on the new-business plan picker before setup, read once by setup-add-on.ts. */
export type BusinessRow = { id: string; name: string; planId: string | null; itemId: string | null; deleted?: boolean; requestedPlanId?: string | null };

/** What the DAL loads for one agency. Only this agency's businesses are ever in here. */
export type PlanChangeContext = {
  agencyId: string;
  agencyStatus: string;
  subscriptionId: string | null;
  plans: PlanRow[];
  businesses: BusinessRow[];
};

/**
 * One subscription item as a schedule phase or preview sees it. Items already on the subscription keep their price
 * ID; a business that is added or changes plan gets a price of its own (`price_data`, BUG-103).
 */
export type ItemSpec = { price?: string; price_data?: PlanPriceData; quantity: number; metadata: Record<string, string> };

export type Timing = "now" | "period_end";

/**
 * Upgrades and adds happen now, downgrades and removals at the period end (D-57). During a trial nothing has been paid,
 * so a plan switch either way happens now, and the trial ends on whatever plan the business is on then (2026-10-17).
 */
export const timingOf = (kind: PlanChange["kind"], trialing = false): Timing =>
  kind === "upgrade" || kind === "add" || (trialing && kind === "downgrade") ? "now" : "period_end";

export const isTrialing = (sub: Pick<Stripe.Subscription, "status">) => sub.status === "trialing";

export class PlanChangeError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "PlanChangeError";
  }
}

const refused = (status: number, message: string) => new PlanChangeError(status, message);
const idOf = (ref: string | { id: string } | null | undefined) => (typeof ref === "string" ? ref : ref?.id ?? "");

export function scheduleIdOf(sub: Stripe.Subscription): string | null {
  return sub.schedule ? idOf(sub.schedule) : null;
}

/** The subscription's item for a business: by metadata first, then by the item ID the webhook saved. */
export function itemFor(sub: Stripe.Subscription, business: BusinessRow): Stripe.SubscriptionItem | null {
  return (
    sub.items.data.find((i) => i.metadata?.business_id === business.id) ??
    sub.items.data.find((i) => i.id === business.itemId) ??
    null
  );
}

/** Set to end: cancel_at_period_end, or cancel_at when a schedule ends the plan (a cancel with a change scheduled). */
export const isCancelling = (sub: Stripe.Subscription) => sub.cancel_at_period_end || sub.cancel_at != null;

/** When a period-end change happens: the trial end during a trial, else the renewal date. */
export function periodEnd(sub: Stripe.Subscription): number {
  if (sub.status === "trialing" && sub.trial_end) return sub.trial_end;
  return Math.min(...sub.items.data.map((i) => i.current_period_end));
}

function planById(ctx: PlanChangeContext, planId: string): PlanRow & { stripePriceId: string } {
  const plan = ctx.plans.find((p) => p.id === planId);
  if (!plan || !plan.stripePriceId) throw refused(400, "That plan can't be chosen here. Contact us to set it up.");
  return { ...plan, stripePriceId: plan.stripePriceId };
}

function businessById(ctx: PlanChangeContext, businessId: string): BusinessRow {
  const business = ctx.businesses.find((b) => b.id === businessId);
  if (!business) throw refused(404, "Business not found.");
  return business;
}

function priceOfItem(ctx: PlanChangeContext, item: Stripe.SubscriptionItem): number {
  const plan = ctx.plans.find((p) => p.id === planIdOfPrice(item.price, ctx.plans));
  return plan?.priceCents ?? item.price.unit_amount ?? 0;
}

export type CheckedChange = {
  change: PlanChange;
  business: BusinessRow | null;
  item: Stripe.SubscriptionItem | null;
  plan: (PlanRow & { stripePriceId: string }) | null;
};

/** Refuses changes that can't happen, with the message the user sees. */
export function checkChange(ctx: PlanChangeContext, sub: Stripe.Subscription, change: PlanChange): CheckedChange {
  if (sub.status === "canceled" || sub.status === "incomplete_expired") {
    throw refused(409, "Your plan has ended. Contact us to start it again.");
  }
  if (change.kind === "keep") {
    if (!isCancelling(sub)) throw refused(409, "Your plan is not set to end.");
    return { change, business: null, item: null, plan: null };
  }
  if (isCancelling(sub)) {
    throw refused(409, "Your plan is set to end. Keep your plan first, then make this change.");
  }
  if (change.kind === "cancel") return { change, business: null, item: null, plan: null };
  if (timingOf(change.kind, isTrialing(sub)) === "now" && (ctx.agencyStatus === "past_due" || sub.status === "past_due")) {
    throw refused(402, "Your last payment didn't go through. Update your card first, then try again.");
  }

  const business = businessById(ctx, change.businessId);
  if (business.deleted && change.kind !== "remove") throw refused(409, `${business.name} was deleted, so it can't be added or changed.`);
  const item = itemFor(sub, business);

  if (change.kind === "keepBusiness") {
    if (business.deleted) throw refused(409, `${business.name} was deleted, so it can't stay on your plan.`);
    if (!item) throw refused(404, `${business.name} is not on your plan.`);
    const currentId = planIdOfPrice(item.price, ctx.plans);
    return { change, business, item, plan: currentId ? planById(ctx, currentId) : null };
  }

  if (change.kind === "add") {
    if (item) throw refused(409, `${business.name} is already on your plan.`);
    return { change, business, item: null, plan: planById(ctx, change.planId) };
  }

  if (!item) throw refused(404, `${business.name} is not on your plan yet.`);
  if (change.kind === "remove") {
    if (sub.items.data.length <= 1) {
      throw refused(409, "This is the only business on your plan. To stop paying, cancel your plan instead.");
    }
    return { change, business, item, plan: null };
  }

  const plan = planById(ctx, change.planId);
  const current = priceOfItem(ctx, item);
  if (planIdOfPrice(item.price, ctx.plans) === plan.id) throw refused(409, `${business.name} is already on ${plan.name}.`);
  if (change.kind === "upgrade" && plan.priceCents <= current) {
    throw refused(400, `${plan.name} costs less than the current plan. Choose downgrade instead.`);
  }
  if (change.kind === "downgrade" && plan.priceCents >= current) {
    throw refused(400, `${plan.name} costs more than the current plan. Choose upgrade instead.`);
  }
  return { change, business, item, plan };
}

export function itemSpec(item: Stripe.SubscriptionItem | Stripe.SubscriptionSchedule.Phase.Item): ItemSpec {
  const metadata: Record<string, string> = {};
  for (const [key, value] of Object.entries(item.metadata ?? {})) if (value) metadata[key] = value;
  return { price: idOf(item.price), quantity: item.quantity ?? 1, metadata };
}

/** Applies one business's change to a list of items. Items match on business_id, which every phase item carries. */
export function applyToItems(items: ItemSpec[], checked: CheckedChange): ItemSpec[] {
  const { change, business, plan } = checked;
  if (!business) return items;
  const matches = (i: ItemSpec) => i.metadata.business_id === business.id;
  switch (change.kind) {
    case "add":
      return [...items, { price_data: planPriceData(plan!), quantity: 1, metadata: { business_id: business.id } }];
    case "remove":
      return items.filter((i) => !matches(i));
    case "upgrade":
    case "downgrade":
      return items.map((i) => (matches(i) ? { price_data: planPriceData(plan!), quantity: i.quantity, metadata: i.metadata } : i));
    default:
      return items;
  }
}

/** Subscription items with business_id filled in from the database link, so phases can match on it. */
export function currentItems(ctx: PlanChangeContext, sub: Stripe.Subscription): ItemSpec[] {
  return sub.items.data.map((item) => {
    const spec = itemSpec(item);
    if (!spec.metadata.business_id) {
      const linked = ctx.businesses.find((b) => b.itemId === item.id);
      if (linked) spec.metadata.business_id = linked.id;
    }
    return spec;
  });
}

export type SchedulePhases = {
  current: Stripe.SubscriptionSchedule.Phase;
  next: Stripe.SubscriptionSchedule.Phase | null;
};

/** The phase running now and the one after it. We only ever write two, so more means someone else edited it. */
export function phasesOf(schedule: Stripe.SubscriptionSchedule): SchedulePhases {
  const start = schedule.current_phase?.start_date;
  const index = schedule.phases.findIndex((p) => p.start_date === start);
  if (index < 0) throw new Error(`schedule ${schedule.id} has no current phase`);
  const later = schedule.phases.slice(index + 1);
  if (later.length > 1) throw new Error(`schedule ${schedule.id} has more than one future phase`);
  return { current: schedule.phases[index], next: later[0] ?? null };
}

/**
 * The phases to write for a change. Changes made now edit the current phase (and the next one, so a pending
 * downgrade of another business survives). Period-end changes edit only the next phase, which starts from the
 * pending items if there are any. The next phase runs one month, then the schedule releases the subscription.
 */
export function buildPhases(
  sub: Stripe.Subscription,
  current: { start: number; end: number; items: ItemSpec[] },
  next: ItemSpec[] | null,
  checked: CheckedChange,
): Stripe.SubscriptionScheduleUpdateParams.Phase[] {
  const now = timingOf(checked.change.kind, isTrialing(sub)) === "now";
  const trialEnd = sub.status === "trialing" && sub.trial_end ? { trial_end: sub.trial_end } : {};
  const currentItems = now ? applyToItems(current.items, checked) : current.items;
  const nextItems = next ? applyToItems(next, checked) : now ? null : applyToItems(current.items, checked);
  const phases: Stripe.SubscriptionScheduleUpdateParams.Phase[] = [
    { items: currentItems, start_date: current.start, end_date: current.end, ...trialEnd },
  ];
  if (nextItems) {
    phases.push({ items: nextItems, duration: { interval: "month", interval_count: 1 }, proration_behavior: "none" });
  }
  return phases;
}

/** Items for a direct subscription update (no schedule): the one item that changes now (a downgrade only in a trial). */
export function subscriptionItemsFor(checked: CheckedChange): Stripe.SubscriptionUpdateParams.Item[] {
  const { change, item, plan, business } = checked;
  if (change.kind === "add") return [{ price_data: planPriceData(plan!), quantity: 1, metadata: { business_id: business!.id } }];
  if (change.kind === "upgrade" || change.kind === "downgrade") return [{ id: item!.id, price_data: planPriceData(plan!) }];
  throw new Error(`${change.kind} is not a change made now`);
}

/** The change in the preview's item shape. For period-end changes the preview is the next renewal bill. */
export function previewItemsFor(checked: CheckedChange): Stripe.InvoiceCreatePreviewParams.SubscriptionDetails.Item[] {
  const { change, item } = checked;
  if (change.kind === "remove") return [{ id: item!.id, deleted: true }];
  return subscriptionItemsFor(checked);
}

export { idempotencyKey } from "./idempotency";
