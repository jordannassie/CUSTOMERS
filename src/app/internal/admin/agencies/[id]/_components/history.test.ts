import { describe, expect, it } from "vitest";
import { businessPlanStatus, ledgerLabel, removalNote } from "./history";

describe("ledgerLabel (agency credit history)", () => {
  it("shows where granted credits came from instead of 'Credits granted'", () => {
    expect(ledgerLabel({ kind: "grant", source: "trial" })).toBe("Trial");
    expect(ledgerLabel({ kind: "grant", source: "plan" })).toBe("Plan");
    expect(ledgerLabel({ kind: "grant", source: "topup" })).toBe("Top-up");
    expect(ledgerLabel({ kind: "grant", source: "admin" })).toBe("Admin");
    expect(ledgerLabel({ kind: "admin_adjust", source: null })).toBe("Admin");
  });
  it("says which credits expired, and keeps the other rows' words", () => {
    expect(ledgerLabel({ kind: "expire", source: "plan" })).toBe("Plan credits expired");
    expect(ledgerLabel({ kind: "expire", source: null })).toBe("Credits expired");
    expect(ledgerLabel({ kind: "refund", source: "topup" })).toBe("Refunded top-up");
  });
  it("names admin credits no admin gave as the system's (admin audit 2026-11-12)", () => {
    expect(ledgerLabel({ kind: "grant", source: "admin", delta: 500, by: null })).toBe("Added by the system");
    expect(ledgerLabel({ kind: "admin_adjust", source: null, delta: -20, by: null })).toBe("Removed by the system");
    expect(ledgerLabel({ kind: "grant", source: "admin", delta: 500, by: "ops@example.test" })).toBe("Admin");
    expect(ledgerLabel({ kind: "grant", source: "plan", delta: 500, by: null })).toBe("Plan");
  });
});

describe("removalNote (deleted businesses on the agency page)", () => {
  const now = new Date("2026-11-12T12:00:00Z");
  it("says the removal is still ahead while it is", () => {
    expect(removalNote({ at: "2026-11-01T00:00:00Z", purgeAfter: "2026-12-01T00:00:00Z" }, now)).toBe(
      "Will be removed for good on Dec 1, 2026 UTC",
    );
  });
  it("says it happened once the date has passed, and gives the delete date without one", () => {
    expect(removalNote({ at: "2026-10-01T00:00:00Z", purgeAfter: "2026-11-01T00:00:00Z" }, now)).toBe("Removed for good on Nov 1, 2026 UTC");
    expect(removalNote({ at: "2026-10-01T00:00:00Z", purgeAfter: null }, now)).toBe("Deleted Oct 1, 2026 UTC");
  });
});

describe("businessPlanStatus", () => {
  it("shows a business trial as ended when the agency's trial has ended, like the agency badge", () => {
    expect(businessPlanStatus("trialing", "trial_ended")).toBe("Trial ended");
    expect(businessPlanStatus("trialing", "trialing")).toBe("On trial");
    expect(businessPlanStatus("past_due", "trial_ended")).toBe("Payment failed");
  });
});
