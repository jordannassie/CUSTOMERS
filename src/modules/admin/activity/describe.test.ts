import { describe, expect, it } from "vitest";
import { alertName, describeChange, describeProblem, detailText } from "./describe";

describe("admin activity wording (admin audit 2026-11-12)", () => {
  it("says what a lead update changed", () => {
    expect(describeChange("lead.update", { mark_read: true, read_at: "2026-11-12T06:14:42Z" })).toBe("Marked as read");
    expect(describeChange("lead.update", { mark_unread: true })).toBe("Marked as unread");
    expect(describeChange("lead.update", { replied: true, status: "contacted" })).toBe("Changed status to Contacted, marked as replied");
    expect(describeChange("lead.update", { status: "in_progress" })).toBe("Changed status to In progress");
    expect(describeChange("lead.update", { handled_by: "sam@example.test" })).toBe("Assigned to sam@example.test");
    expect(describeChange("lead.update", { handled_by: null })).toBe("Unassigned");
    expect(describeChange("lead.update", { notes_changed: true })).toBe("Changed the notes");
  });

  it("gives credit changes their amount and direction, and the test flag on or off", () => {
    expect(describeChange("agency.adjust_credits", { delta: 50, reason: "goodwill" })).toBe("Added 50 credits");
    expect(describeChange("agency.adjust_credits", { delta: -1 })).toBe("Removed 1 credit");
    expect(describeChange("agency.mark_test", { is_test: true })).toBe("Test flag turned on");
    expect(describeChange("agency.mark_test", { is_test: false })).toBe("Test flag turned off");
    expect(describeChange("agency.extend_trial", { days: 7 })).toBe("Added 7 days");
    expect(describeChange("feature_request.update", { status: "planned" })).toBe("Changed status to Planned");
    expect(describeChange("stripe.topup_refund", { credits: 500, removed: 300 })).toBe("Took back 300 credits, 200 credits already used");
  });

  it("says nothing extra when the label already says it all", () => {
    expect(describeChange("agency.suspend", { reason: "fraud" })).toBeNull();
    expect(describeChange("scan_job.retry", {})).toBeNull();
    expect(describeChange("lead.update", null)).toBeNull();
  });

  it("explains a change that did not go through in plain words, never the raw code", () => {
    expect(describeProblem("done", { error: "not_failed" })).toBeNull();
    expect(describeProblem("failed", { error: "not_failed" })).toBe("The scan had not failed, or was already retried.");
    expect(describeProblem("failed", { error: "already resolved", reason: "Again" })).toBe("The alert was already resolved.");
    expect(describeProblem("failed", { error: "Stripe refused: No such subscription" })).toBe("Stripe turned down the change, so nothing was saved.");
    for (const raw of ["database went away", "duplicate key value violates unique constraint", undefined]) {
      const text = describeProblem("failed", { error: raw });
      expect(text).toBe("Something went wrong while saving, so nothing was changed.");
    }
    expect(describeProblem("started", { error: "could not save the trial end" })).not.toContain("trial end");
  });

  it("names alerts as the Overview does", () => {
    expect(alertName("failed_scans")).toBe("Failed scans alert");
    expect(alertName("service_check:stripe")).toBe("Service check alert");
    expect(alertName("resolve_test")).toBe("An alert");
    expect(alertName(null)).toBe("An alert");
    expect(detailText({ kind: "stuck_jobs" }, "kind")).toBe("stuck_jobs");
    expect(detailText([], "kind")).toBeNull();
  });
});
