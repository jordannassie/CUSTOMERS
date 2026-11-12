import { describe, expect, it } from "vitest";
import { actionLabel, activityQuery, reasonOf, targetHref } from "./service";

describe("admin activity (admin review 2026-11-12)", () => {
  it("says what each action did in plain words, and reads an unknown one from its code", () => {
    expect(actionLabel("agency.adjust_credits")).toBe("Changed credits");
    expect(actionLabel("scan_job.retry")).toBe("Retried a scan");
    expect(actionLabel("billing.manual_refund")).toBe("Billing manual refund");
  });

  it("links agencies and businesses, and nothing else", () => {
    expect(targetHref("agency", "a1")).toBe("/internal/admin/agencies/a1");
    expect(targetHref("business", "b1")).toBe("/internal/admin/businesses/b1");
    expect(targetHref("scan_job", "j1")).toBeNull();
    expect(targetHref("agency", null)).toBeNull();
  });

  it("finds the reason the admin typed", () => {
    expect(reasonOf({ reason: "  Support ticket 42 " })).toBe("Support ticket 42");
    expect(reasonOf({ delta: 5 })).toBeNull();
    expect(reasonOf(null)).toBeNull();
  });

  it("treats a filter that does not parse as no filter", () => {
    expect(activityQuery.parse({ area: "agency", failed: "1", page: "2" })).toEqual({ area: "agency", failed: "1", page: 2 });
    expect(activityQuery.parse({ area: "nonsense", failed: "yes", page: "0" })).toEqual({ page: 1 });
  });
});
