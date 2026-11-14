import { describe, expect, it } from "vitest";
import { isMissingInStripe, isOtherStripeMode } from "./stripe-missing";

describe("stripe-missing", () => {
  const missing = (message: string) => Object.assign(new Error(message), { code: "resource_missing", statusCode: 404 });

  it("tells an object in Stripe's other mode apart from one that is gone (QA 2026-11-01)", () => {
    const live = missing("No such customer: 'cus_1'; a similar object exists in live mode, but a test mode key was used to make this request.");
    const test = missing("No such subscription: 'sub_1'; a similar object exists in test mode, but a live mode key was used to make this request.");
    const gone = missing("No such subscription: 'sub_1'");
    expect([live, test, gone].map(isMissingInStripe)).toEqual([true, true, true]);
    expect([live, test, gone].map(isOtherStripeMode)).toEqual([true, true, false]);
    expect(isOtherStripeMode(null)).toBe(false);
  });
});
