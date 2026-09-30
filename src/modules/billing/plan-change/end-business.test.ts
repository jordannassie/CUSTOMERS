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

  it("refuses a business from another agency", async () => {
    const s = use(setup());
    await expect(endBusinessPlan("agency-1", "00000000-0000-4000-8000-0000000000ff", now(s))).rejects.toMatchObject({ status: 404 });
  });
});
