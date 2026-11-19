import { beforeEach, describe, expect, it, vi } from "vitest";

// The real Stripe reader behind "Unsuspend", with the Stripe client swapped for a fake: no network calls.
const fake = vi.hoisted(() => ({ calls: [] as string[], answer: async (): Promise<unknown> => ({}) }));
vi.mock("@/modules/billing/stripe", async (original) => ({
  ...(await original<typeof import("@/modules/billing/stripe")>()),
  getStripe: () => ({
    subscriptions: {
      retrieve: (id: string) => {
        fake.calls.push(id);
        return fake.answer();
      },
    },
  }),
}));

const { subscriptionAgencyStatus } = await import("@/modules/billing");

const fails = (error: Error) => async () => {
  throw error;
};

beforeEach(() => {
  fake.calls = [];
});

describe("subscriptionAgencyStatus", () => {
  it.each([
    ["active", "active"],
    ["trialing", "trialing"],
    ["unpaid", "past_due"],
    ["canceled", "canceled"],
    ["incomplete", null],
  ])("maps a %s subscription to %s, as the webhooks do", async (stripeStatus, expected) => {
    fake.answer = async () => ({ id: "sub_1", status: stripeStatus });
    expect(await subscriptionAgencyStatus("sub_1")).toBe(expected);
    expect(fake.calls).toEqual(["sub_1"]);
  });

  it("treats a subscription Stripe does not have as canceled", async () => {
    fake.answer = fails(Object.assign(new Error("No such subscription"), { code: "resource_missing", statusCode: 404 }));
    expect(await subscriptionAgencyStatus("sub_gone")).toBe("canceled");
  });

  it("passes on an outage instead of guessing", async () => {
    fake.answer = fails(Object.assign(new Error("connection reset"), { statusCode: 500 }));
    await expect(subscriptionAgencyStatus("sub_1")).rejects.toThrow("connection reset");
  });
});
