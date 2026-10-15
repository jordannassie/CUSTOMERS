import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PlanChangeContext } from "./planner";
import { A, B, C, plansByProduct, RENEWAL, setup } from "./scenario.test-helpers";
import type { FakeStripe } from "./fake-stripe";

// Deleting a business ends its plan item at period end (B-77, MVP_SPEC 23), against the in-memory Stripe.
const loaded = vi.hoisted(() => ({ ctx: null as PlanChangeContext | null, stripe: null as FakeStripe | null }));
vi.mock("./dal", () => ({ loadPlanChangeData: async () => ({ context: loaded.ctx, plansByProduct }) }));
vi.mock("../account/access", () => ({
  billingAccess: async () => ({ mode: "fixture", context: loaded.ctx, stripe: loaded.stripe }),
}));

const { endBusinessPlan } = await import("./end-business");

function use(s: ReturnType<typeof setup>) {
  loaded.ctx = s.ctx;
  loaded.stripe = s.stripe;
  return s;
}

const now = (s: ReturnType<typeof setup>) => new Date(s.stripe.clock * 1000);

beforeEach(() => {
  loaded.ctx = null;
  loaded.stripe = null;
});

describe("endBusinessPlan", () => {
  it("removes the business's item at the end of the period and keeps the others", async () => {
    const s = use(setup());
    const result = await endBusinessPlan("agency-1", A, now(s));

    expect(result.endsAt).toBe(new Date(RENEWAL * 1000).toISOString());
    const schedule = s.stripe.calls.find((c) => c.method === "updateSchedule")!;
    const phases = (schedule.params as { phases: { items: { metadata: { business_id: string } }[] }[] }).phases;
    expect(phases[0].items.map((i) => i.metadata.business_id)).toEqual([A, B]);
    expect(phases[1].items.map((i) => i.metadata.business_id)).toEqual([B]);
    expect(s.stripe.invoices).toHaveLength(0);
  });

  it("ends the whole plan at period end when it is the only business on it", async () => {
    const s = use(setup({ b: null }));
    const result = await endBusinessPlan("agency-1", A, now(s));

    expect(result.endsAt).toBe(new Date(RENEWAL * 1000).toISOString());
    expect(s.stripe.subscription().cancel_at_period_end).toBe(true);
  });

  it("changes nothing for a business that is not on the plan", async () => {
    const s = use(setup());
    expect(await endBusinessPlan("agency-1", C, now(s))).toEqual({ endsAt: null });
    expect(s.stripe.calls.filter((c) => c.method !== "retrieveSubscription" && c.method !== "retrieveSchedule")).toHaveLength(0);
  });

  it("changes nothing when the agency has no subscription", async () => {
    const s = use(setup());
    loaded.ctx = { ...s.ctx, subscriptionId: null };
    expect(await endBusinessPlan("agency-1", A, now(s))).toEqual({ endsAt: null });
    expect(s.stripe.calls).toHaveLength(0);
  });

  it("lets the business go when Stripe has no such subscription, but not when Stripe is down (2026-10-14)", async () => {
    const s = use(setup());
    const missing = Object.assign(new Error("No such subscription: 'sub_local_sim_abdul'"), { type: "StripeInvalidRequestError", code: "resource_missing", statusCode: 404 });
    vi.spyOn(s.stripe, "retrieveSubscription").mockRejectedValueOnce(missing);
    vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(await endBusinessPlan("agency-1", A, now(s))).toEqual({ endsAt: null });

    const down = Object.assign(new Error("connection reset"), { type: "StripeConnectionError" });
    vi.spyOn(s.stripe, "retrieveSubscription").mockRejectedValueOnce(down);
    await expect(endBusinessPlan("agency-1", A, now(s))).rejects.toThrow("connection reset");
  });

  it("refuses a business from another agency", async () => {
    const s = use(setup());
    await expect(endBusinessPlan("agency-1", "00000000-0000-4000-8000-0000000000ff", now(s))).rejects.toMatchObject({ status: 404 });
  });
});

// 2026-10-15: a business deleted during a trial was still listed at $149 a month until the trial end.
describe("endBusinessPlan during a trial", () => {
  const ids = (s: ReturnType<typeof setup>) => s.stripe.items.map((i) => i.metadata.business_id);

  it("takes the business off the plan at once, with nothing charged now or at the trial end", async () => {
    const s = use(setup({ status: "trialing" }));
    expect(await endBusinessPlan("agency-1", A, now(s))).toEqual({ endsAt: null, removedNow: true });
    expect(ids(s)).toEqual([B]);
    expect(s.stripe.invoices).toHaveLength(0);

    s.stripe.advanceTo(RENEWAL + 60);
    const firstBill = s.stripe.invoices.at(-1)!;
    expect(firstBill.amount_due).toBe(14900);
  });

  it("takes it out of every schedule phase, keeping another business's scheduled change", async () => {
    const s = use(setup({ a: "price_pro", status: "trialing" }));
    await s.change({ kind: "add", businessId: C, planId: "starter" });
    await s.change({ kind: "downgrade", businessId: A, planId: "starter" });

    await endBusinessPlan("agency-1", B, now(s));
    expect(ids(s).sort()).toEqual([A, C].sort());
    const phases = s.stripe.schedule!.phases;
    expect(phases.map((p) => p.items.map((i) => i.metadata.business_id).sort())).toEqual([[A, C].sort(), [A, C].sort()]);
    expect(JSON.stringify(s.stripe.calls.at(-1)!.params)).toContain("trial_end");

    s.stripe.advanceTo(RENEWAL + 60);
    expect(s.stripe.invoices.at(-1)!.amount_due).toBe(14900 * 2);
  });

  it("ends the plan at the trial end when every other business was already coming off", async () => {
    const s = use(setup({ status: "trialing" }));
    await s.change({ kind: "remove", businessId: B });
    await endBusinessPlan("agency-1", A, now(s));
    expect(ids(s)).toEqual([B]);
    expect(s.stripe.schedule!.endBehavior).toBe("cancel");
    s.stripe.advanceTo(RENEWAL + 60);
    expect(s.stripe.status).toBe("canceled");
  });

  it("still cancels at the trial end when it is the only business, which is never charged either", async () => {
    const s = use(setup({ b: null, status: "trialing" }));
    const result = await endBusinessPlan("agency-1", A, now(s));
    expect(result.removedNow).toBeUndefined();
    expect(s.stripe.subscription().cancel_at_period_end).toBe(true);
  });
});
