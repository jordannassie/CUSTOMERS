import type Stripe from "stripe";
import { describe, expect, it } from "vitest";
import { planPriceMoves, priceMoveKey, type MoveBusiness, type MovePlan } from "./service";

// D-93: a plan price change reaches existing customers at their next renewal, never mid-month.
const RENEWAL = 1_800_000_000;
const TRIAL_END = 1_799_000_000;
const plans: MovePlan[] = [
  { id: "starter", priceCents: 16900 },
  { id: "pro", priceCents: 24900 },
];
const price = (plan: string, cents: number) => ({ id: `price_${plan}_${cents}`, product: `cd_plan_${plan}`, unit_amount: cents }) as Stripe.Price;
const item = (id: string, business: string, plan: string, cents: number) =>
  ({ id, price: price(plan, cents), quantity: 1, metadata: { business_id: business }, current_period_end: RENEWAL }) as unknown as Stripe.SubscriptionItem;

function sub(items: Stripe.SubscriptionItem[], extra: Partial<Stripe.Subscription> = {}): Stripe.Subscription {
  return { id: "sub_1", status: "active", cancel_at_period_end: false, cancel_at: null, trial_end: null, schedule: null, items: { data: items }, ...extra } as unknown as Stripe.Subscription;
}
const phaseItem = (business: string, plan: string, cents: number) => ({ price: price(plan, cents), quantity: 1, metadata: { business_id: business } });
function schedule(current: ReturnType<typeof phaseItem>[], next: ReturnType<typeof phaseItem>[]): Stripe.SubscriptionSchedule {
  return {
    id: "sub_sched_1",
    current_phase: { start_date: 1, end_date: RENEWAL },
    phases: [
      { start_date: 1, end_date: RENEWAL, items: current },
      { start_date: RENEWAL, end_date: RENEWAL + 2_592_000, items: next },
    ],
  } as unknown as Stripe.SubscriptionSchedule;
}
const businesses: MoveBusiness[] = [
  { id: "b1", itemId: "si_1", deleted: false },
  { id: "b2", itemId: "si_2", deleted: false },
];

describe("planPriceMoves", () => {
  it("moves an item on an old amount to the plan's price from the renewal, with no charge now", () => {
    const plan = planPriceMoves({ sub: sub([item("si_1", "b1", "starter", 14900), item("si_2", "b2", "pro", 24900)]), schedule: null, plans, businesses });
    expect(plan.moves).toEqual([{ businessId: "b1", planId: "starter", fromCents: 14900, toCents: 16900 }]);
    expect(plan.update).toEqual({
      kind: "subscription",
      items: [{ id: "si_1", price_data: { currency: "usd", product: "cd_plan_starter", unit_amount: 16900, recurring: { interval: "month" } } }],
    });
    expect(plan.startsAt).toBe(RENEWAL);
    expect(plan.prices).toEqual([
      { itemId: "si_1", cents: 16900 },
      { itemId: "si_2", cents: 24900 },
    ]);
  });

  it("changes nothing when every item is on its plan's price, but still reports the prices to save", () => {
    const plan = planPriceMoves({ sub: sub([item("si_2", "b2", "pro", 24900)]), schedule: null, plans, businesses });
    expect(plan).toMatchObject({ moves: [], update: null, prices: [{ itemId: "si_2", cents: 24900 }] });
  });

  it("moves a lower price too", () => {
    const plan = planPriceMoves({ sub: sub([item("si_2", "b2", "pro", 29900)]), schedule: null, plans, businesses });
    expect(plan.moves).toEqual([{ businessId: "b2", planId: "pro", fromCents: 29900, toCents: 24900 }]);
  });

  it("starts the new price at the trial end during a trial", () => {
    const plan = planPriceMoves({ sub: sub([item("si_1", "b1", "starter", 14900)], { status: "trialing", trial_end: TRIAL_END }), schedule: null, plans, businesses });
    expect(plan.startsAt).toBe(TRIAL_END);
    expect(plan.moves).toHaveLength(1);
  });

  it("leaves a subscription that will not renew, and a deleted business, alone", () => {
    const old = [item("si_1", "b1", "starter", 14900)];
    expect(planPriceMoves({ sub: sub(old, { cancel_at_period_end: true }), schedule: null, plans, businesses }).update).toBeNull();
    expect(planPriceMoves({ sub: sub(old, { status: "canceled" }), schedule: null, plans, businesses }).update).toBeNull();
    expect(planPriceMoves({ sub: sub(old, { status: "unpaid" }), schedule: null, plans, businesses }).update).toBeNull();
    const deleted = [{ id: "b1", itemId: "si_1", deleted: true }];
    expect(planPriceMoves({ sub: sub(old), schedule: null, plans, businesses: deleted }).update).toBeNull();
  });

  it("with a pending downgrade, moves the renewal to the new plan's price and leaves the current plan as paid", () => {
    const s = sub([item("si_1", "b1", "pro", 24900)], { schedule: "sub_sched_1" });
    const plan = planPriceMoves({ sub: s, schedule: schedule([phaseItem("b1", "pro", 24900)], [phaseItem("b1", "starter", 14900)]), plans, businesses });
    expect(plan.moves).toEqual([{ businessId: "b1", planId: "starter", fromCents: 14900, toCents: 16900 }]);
    expect(plan.update?.kind).toBe("schedule");
    const phases = plan.update?.kind === "schedule" ? plan.update.phases : [];
    expect(phases[0].items[0]).toMatchObject({ price: "price_pro_24900" });
    expect(phases[1].items[0]).toMatchObject({ price_data: { unit_amount: 16900, product: "cd_plan_starter" }, metadata: { business_id: "b1" } });
    expect(phases[1]).toMatchObject({ proration_behavior: "none" });
    expect(plan.prices).toEqual([{ itemId: "si_1", cents: 24900 }]);
  });

  it("with a schedule, moves a business that renews on the same plan in both phases, and not one coming off", () => {
    const s = sub([item("si_1", "b1", "starter", 14900), item("si_2", "b2", "starter", 14900)], { schedule: "sub_sched_1" });
    const both = [phaseItem("b1", "starter", 14900), phaseItem("b2", "starter", 14900)];
    const plan = planPriceMoves({ sub: s, schedule: schedule(both, [phaseItem("b1", "starter", 14900)]), plans, businesses });
    expect(plan.moves).toEqual([{ businessId: "b1", planId: "starter", fromCents: 14900, toCents: 16900 }]);
    const phases = plan.update?.kind === "schedule" ? plan.update.phases : [];
    expect(phases[0].items.map((i) => i.price_data?.unit_amount ?? null)).toEqual([16900, null]);
    expect(phases[1].items).toHaveLength(1);
    expect(plan.prices).toEqual([
      { itemId: "si_1", cents: 16900 },
      { itemId: "si_2", cents: 14900 },
    ]);
  });
});

describe("priceMoveKey", () => {
  it("is the same for the same moves in any order", () => {
    const a = { businessId: "b1", planId: "starter", fromCents: 1, toCents: 2 };
    const b = { businessId: "b2", planId: "pro", fromCents: 1, toCents: 3 };
    expect(priceMoveKey("sub_1", [a, b], RENEWAL)).toBe(priceMoveKey("sub_1", [b, a], RENEWAL));
  });
});
