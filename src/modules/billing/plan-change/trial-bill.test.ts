import type Stripe from "stripe";
import { describe, expect, it } from "vitest";
import * as fx from "../webhooks/fixtures.test-helpers";
import { firstChargeCents } from "./trial-bill";

// The trial ending email's amount (BUG-245 for the email): a business coming off at the trial end is not charged.

const trialEnd = Date.UTC(2026, 9, 2, 12) / 1000;
const start = trialEnd - 7 * 86_400;

function trial(cents: number[]): Stripe.Subscription {
  const sub = fx.subscription({
    customer: "cus_x",
    status: "trialing",
    trialEnd,
    items: cents.map((_, i) => ({ product: "cd_plan_starter", businessId: `b${i}`, periodEnd: trialEnd })),
  });
  sub.items.data.forEach((item, i) => Object.assign(item.price, { unit_amount: cents[i], currency: "usd" }));
  return sub;
}

type PhaseItem = { price: string | Partial<Stripe.Price>; quantity?: number; businessId: string };

function schedule(current: PhaseItem[], next: PhaseItem[] | null): Stripe.SubscriptionSchedule {
  const phase = (items: PhaseItem[], from: number, to: number) => ({
    start_date: from,
    end_date: to,
    items: items.map((i) => ({ price: i.price, quantity: i.quantity ?? 1, metadata: { business_id: i.businessId } })),
  });
  const phases = [phase(current, start, trialEnd), ...(next ? [phase(next, trialEnd, trialEnd + 30 * 86_400)] : [])];
  return { id: "sub_sched_1", current_phase: { start_date: start, end_date: trialEnd }, phases } as unknown as Stripe.SubscriptionSchedule;
}

describe("firstChargeCents", () => {
  it("charges every business on the plan when nothing is scheduled", () => {
    expect(firstChargeCents(trial([14900, 24900]), null)).toBe(39800);
  });

  it("leaves out a business scheduled to come off at the trial end", () => {
    const sub = trial([14900, 24900]);
    const [kept, removed] = sub.items.data;
    const sched = schedule(
      [
        { price: kept.price.id, businessId: "b0" },
        { price: removed.price.id, businessId: "b1" },
      ],
      [{ price: kept.price.id, businessId: "b0" }],
    );
    expect(firstChargeCents(sub, sched)).toBe(14900);
  });

  it("uses an expanded price the subscription does not have (a plan change at the trial end)", () => {
    const sub = trial([24900]);
    const sched = schedule(
      [{ price: sub.items.data[0].price.id, businessId: "b0" }],
      [{ price: { id: "price_new", object: "price", unit_amount: 14900, currency: "usd" }, businessId: "b0" }],
    );
    expect(firstChargeCents(sub, sched)).toBe(14900);
  });

  it("follows the items now when the schedule has no next phase", () => {
    const sub = trial([14900]);
    expect(firstChargeCents(sub, schedule([{ price: sub.items.data[0].price.id, businessId: "b0" }], null))).toBe(14900);
  });

  it("gives up on an unknown price, another currency, or a schedule someone else edited", () => {
    const sub = trial([14900]);
    expect(firstChargeCents(sub, schedule([], [{ price: "price_unknown", businessId: "b0" }]))).toBeNull();
    const euros = schedule([], [{ price: { id: "price_eur", unit_amount: 14900, currency: "eur" }, businessId: "b0" }]);
    expect(firstChargeCents(sub, euros)).toBeNull();
    const edited = schedule([], [{ price: sub.items.data[0].price.id, businessId: "b0" }]);
    edited.phases.push({ ...edited.phases[1], start_date: trialEnd + 30 * 86_400 });
    expect(firstChargeCents(sub, edited)).toBeNull();
  });
});
