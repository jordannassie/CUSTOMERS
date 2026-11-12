import { describe, expect, it } from "vitest";
import { stripeDashboardUrl } from "./dal";

describe("Stripe links on the agency page (admin review 2026-11-12)", () => {
  it("opens the test dashboard with a test key and the live one with a live key", () => {
    expect(stripeDashboardUrl("customers", "cus_123", "sk_test_abc")).toBe("https://dashboard.stripe.com/test/customers/cus_123");
    expect(stripeDashboardUrl("subscriptions", "sub_9", "rk_live_abc")).toBe("https://dashboard.stripe.com/subscriptions/sub_9");
  });

  it("links nothing when the agency is not in Stripe", () => {
    expect(stripeDashboardUrl("customers", null, "sk_test_abc")).toBeNull();
  });
});
