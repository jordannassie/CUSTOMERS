import { describe, expect, it } from "vitest";
import { actionLabel, activityQuery, reasonOf, targetHref } from "./service";

describe("admin activity (admin review 2026-11-12)", () => {
  it("says what each action did in plain words, and reads an unknown one from its code", () => {
    expect(actionLabel("agency.adjust_credits")).toBe("Changed credits");
    expect(actionLabel("scan_job.retry")).toBe("Retried a scan");
    expect(actionLabel("billing.manual_refund")).toBe("Billing manual refund");
    expect(actionLabel("app_review.reject")).toBe("Rejected a review");
    expect(actionLabel("app.save")).toBe("Saved an AI app");
  });

  it("links each kind of target to where an admin can open it", () => {
    expect(targetHref("agency", "a1")).toBe("/internal/admin/agencies/a1");
    expect(targetHref("business", "b1")).toBe("/internal/admin/businesses/b1");
    expect(targetHref("scan_job", "j1")).toBeNull();
    expect(targetHref("scan_job", "j1", "b1")).toBe("/internal/admin/scans?business=b1");
    expect(targetHref("lead", "l1")).toBe("/internal/admin/leads?lead=l1");
    expect(targetHref("feature_request", "f1")).toBe("/internal/admin/feature-requests");
    expect(targetHref("system_alert", "s1")).toBeNull();
    expect(targetHref("agency", null)).toBeNull();
    expect(targetHref("app", "canva")).toBe("/internal/admin/apps");
    expect(targetHref("app_review", "r1")).toBe("/internal/admin/reviews?review=r1");
  });

  it("finds the reason the admin typed", () => {
    expect(reasonOf({ reason: "  Support ticket 42 " })).toBe("Support ticket 42");
    expect(reasonOf({ delta: 5 })).toBeNull();
    expect(reasonOf(null)).toBeNull();
    // Stripe rows carry a note the app wrote, with a refund id, not a reason an admin gave.
    expect(reasonOf({ reason: "Refund re_1: 5 credits removed." }, "stripe.topup_refund")).toBeNull();
  });

  it("treats a filter that does not parse as no filter", () => {
    expect(activityQuery.parse({ area: "agency", failed: "1", page: "2" })).toEqual({ area: "agency", failed: "1", page: 2 });
    expect(activityQuery.parse({ area: "nonsense", failed: "yes", page: "0" })).toEqual({ page: 1 });
  });
});
