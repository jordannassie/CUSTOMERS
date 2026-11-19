import { describe, expect, it } from "vitest";
import { reportLabel, reviewTab } from "./review-tabs";

describe("app review tabs (admin audit 2026-11-12)", () => {
  it("opens the queue unless the address names another status", () => {
    expect(reviewTab("rejected")).toBe("rejected");
    expect(reviewTab("all")).toBe("all");
    expect(reviewTab("nope")).toBe("pending");
    expect(reviewTab(undefined)).toBe("pending");
  });

  it("says why a review was reported in plain words", () => {
    expect(reportLabel("not_a_customer")).toBe("Reported: not a real customer");
    expect(reportLabel("weird_code")).toBe("Reported: weird code");
  });
});
