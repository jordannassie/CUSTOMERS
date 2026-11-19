import { beforeEach, describe, expect, it, vi } from "vitest";

// A4: the admin "Extend trial" on a subscription with and without a scheduled plan change. Stripe is mocked: the
// test pins which object is updated, with what trial end, and that nothing is prorated.
const stripe = {
  subscriptions: { retrieve: vi.fn(), update: vi.fn() },
  subscriptionSchedules: { retrieve: vi.fn(), update: vi.fn() },
};
vi.mock("./stripe", () => ({ getStripe: () => stripe }));
const { extendSubscriptionTrial } = await import("./trial-extend");

const A = "00000000-0000-4000-8000-00000000000a";
const item = (price: string) => ({ price: { id: price }, quantity: 1, metadata: { business_id: A } });
const NEW_END = new Date("2026-10-20T00:00:00Z");
const end = NEW_END.getTime() / 1000;

beforeEach(() => vi.clearAllMocks());

describe("extendSubscriptionTrial (A4)", () => {
  it("moves the trial end on the subscription itself when no plan change is scheduled", async () => {
    stripe.subscriptions.retrieve.mockResolvedValue({ id: "sub_1", schedule: null });
    await extendSubscriptionTrial("sub_1", NEW_END);
    expect(stripe.subscriptions.update).toHaveBeenCalledWith("sub_1", { trial_end: end, proration_behavior: "none" });
    expect(stripe.subscriptionSchedules.update).not.toHaveBeenCalled();
  });

  it("moves it through the schedule when a downgrade waits, keeping the downgrade after the new trial end", async () => {
    stripe.subscriptions.retrieve.mockResolvedValue({ id: "sub_1", schedule: "sub_sched_1" });
    stripe.subscriptionSchedules.retrieve.mockResolvedValue({
      id: "sub_sched_1",
      current_phase: { start_date: 100, end_date: 700 },
      phases: [
        { start_date: 100, end_date: 700, trial_end: 700, items: [item("price_pro")] },
        { start_date: 700, end_date: 3400, items: [item("price_starter")] },
      ],
    });
    await extendSubscriptionTrial("sub_1", NEW_END);
    // Stripe refuses a trial_end on a scheduled subscription, so it is never sent there.
    expect(stripe.subscriptions.update).not.toHaveBeenCalled();
    const [id, params] = stripe.subscriptionSchedules.update.mock.calls[0];
    expect(id).toBe("sub_sched_1");
    expect(params.proration_behavior).toBe("none");
    expect(params.phases[0]).toMatchObject({ start_date: 100, end_date: end, trial_end: end, items: [{ price: "price_pro" }] });
    expect(params.phases[1]).toMatchObject({ items: [{ price: "price_starter" }], duration: { interval: "month", interval_count: 1 } });
  });
});
