import type Stripe from "stripe";
import { describe, expect, it, vi } from "vitest";
import type { PlanChangeStripe } from "../plan-change/client";
import type { PriceNotice } from "./dal";
import { priceChangeEmail, priceChangeParagraphs } from "./emails";
import { runPriceMoves, type PriceMoveDeps } from "./run";

// D-93: the hourly job moves old amounts to the plan price from the renewal, then emails each agency once.
const RENEWAL = 1_800_000_000;
const subscription = {
  id: "sub_1",
  status: "active",
  cancel_at_period_end: false,
  cancel_at: null,
  trial_end: null,
  schedule: null,
  items: { data: [{ id: "si_1", price: { id: "p", product: "cd_plan_starter", unit_amount: 14900 }, quantity: 1, metadata: { business_id: "b1" }, current_period_end: RENEWAL }] },
} as unknown as Stripe.Subscription;

const notice: PriceNotice = {
  batch: "batch-1",
  agencyId: "agency-1",
  startsAt: new Date(RENEWAL * 1000).toISOString(),
  trialing: false,
  lines: [{ business: "Sunrise Coffee", plan: "Starter", fromCents: 14900, toCents: 16900 }],
};

function deps(overrides: Partial<PriceMoveDeps> = {}) {
  const stripe = {
    retrieveSubscription: vi.fn(async () => subscription),
    retrieveSchedule: vi.fn(),
    updateSubscription: vi.fn(async () => subscription),
    updateSchedule: vi.fn(),
  } as unknown as PlanChangeStripe;
  const d = {
    stripe,
    candidates: vi.fn(async () => [{ id: "agency-1", subscriptionId: "sub_1", ownerUserId: "u1" }]),
    context: vi.fn(async () => ({ plans: [{ id: "starter", priceCents: 16900 }], businesses: [{ id: "b1", itemId: "si_1", deleted: false }] })),
    record: vi.fn(async () => {}),
    forget: vi.fn(async () => {}),
    savePrices: vi.fn(async () => {}),
    notices: vi.fn(async () => [notice]),
    ownerEmail: vi.fn(async () => "owner@example.test"),
    sentKeys: vi.fn(async () => new Set<string>()),
    send: vi.fn(async () => ({ status: "sent" as const, id: "e1" })),
    now: () => new Date("2026-10-29T10:00:00Z"),
    ...overrides,
  };
  return d as typeof d & PriceMoveDeps;
}

describe("runPriceMoves", () => {
  it("records the change, moves the item in Stripe with no proration, saves the price and emails the owner", async () => {
    const d = deps();
    expect(await runPriceMoves(d)).toMatchObject({ moved: 1, checked: 1, sent: 1, failed: 0 });
    expect(d.record).toHaveBeenCalledWith("agency-1", expect.objectContaining({ moves: [{ businessId: "b1", planId: "starter", fromCents: 14900, toCents: 16900 }] }), expect.any(String));
    expect(d.stripe!.updateSubscription).toHaveBeenCalledWith(
      "sub_1",
      { items: [{ id: "si_1", price_data: expect.objectContaining({ unit_amount: 16900 }) }], proration_behavior: "none" },
      expect.stringMatching(/^price-move:sub_1:/),
    );
    expect(d.savePrices).toHaveBeenCalledWith("agency-1", [{ itemId: "si_1", cents: 16900 }]);
    expect(d.send).toHaveBeenCalledWith(expect.objectContaining({ type: "price_change", to: "owner@example.test", idempotencyKey: "price_change:batch-1" }));
  });

  it("takes the record back when Stripe refuses, so no email announces a change that did not happen", async () => {
    const d = deps({ notices: vi.fn(async () => []) });
    vi.mocked(d.stripe!.updateSubscription).mockRejectedValueOnce(new Error("card declined"));
    expect(await runPriceMoves(d)).toMatchObject({ moved: 0, failed: 1 });
    const batch = vi.mocked(d.record).mock.calls[0][2];
    expect(d.forget).toHaveBeenCalledWith(batch);
    expect(d.savePrices).not.toHaveBeenCalled();
  });

  it("sends each notice once", async () => {
    const d = deps({ candidates: vi.fn(async () => []), sentKeys: vi.fn(async () => new Set(["price_change:batch-1"])) });
    expect(await runPriceMoves(d)).toMatchObject({ sent: 0 });
    expect(d.send).not.toHaveBeenCalled();
  });

  it("moves nothing without Stripe set up, and still sends notices already recorded", async () => {
    const d = deps({ stripe: null });
    expect(await runPriceMoves(d)).toMatchObject({ checked: 0, sent: 1 });
    expect(d.candidates).not.toHaveBeenCalled();
  });
});

describe("the price change email", () => {
  it("says the new price, the old one and the date it starts, and that nothing changes before then", () => {
    expect(priceChangeParagraphs(notice)).toEqual([
      "From your next renewal on January 15, 2027 (UTC), your plan is billed at our new prices.",
      "Sunrise Coffee (Starter): $169 a month from January 15, 2027 (UTC), instead of $149 a month.",
      "Nothing changes before then. You can change or cancel your plan in Billing at any time before January 15, 2027 (UTC).",
    ]);
    expect(priceChangeParagraphs({ ...notice, trialing: true })[0]).toBe("When your free trial ends on January 15, 2027 (UTC), your plan is billed at our new prices.");
    expect(priceChangeEmail({ to: "a@b.test", notice }).subject).toBe("Your Customers.Direct price is changing");
    const lower = { ...notice, lines: [{ ...notice.lines[0], toCents: 12900 }] };
    expect(priceChangeEmail({ to: "a@b.test", notice: lower }).subject).toBe("Your Customers.Direct price is going down");
  });
});
