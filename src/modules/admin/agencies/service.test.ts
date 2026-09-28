import { describe, expect, it } from "vitest";
import { aiCostShare } from "../overview/service";
import { adjustCreditsInput, extendTrialInput } from "./schema";
import { canRestore, extendedTrialEnd, planMix, restoreDeadline, statusAfterUnsuspend } from "./service";

const NOW = new Date("2026-09-29T12:00:00Z");
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000).toISOString();
const ID = "00000000-0000-4000-8000-000000000001";

describe("restore window (MVP_SPEC 23)", () => {
  it("allows a restore up to 30 days after deletion", () => {
    expect(canRestore("deleted", daysAgo(29), NOW)).toBe(true);
    expect(canRestore("deleted", daysAgo(31), NOW)).toBe(false);
  });

  it("never restores an agency that is not deleted or has no deletion time", () => {
    expect(canRestore("suspended", daysAgo(1), NOW)).toBe(false);
    expect(canRestore("deleted", null, NOW)).toBe(false);
    expect(restoreDeadline("active", daysAgo(1))).toBeNull();
  });
});

describe("statusAfterUnsuspend", () => {
  it("puts back the billing status it had", () => {
    expect(statusAfterUnsuspend("past_due")).toBe("past_due");
    expect(statusAfterUnsuspend("trialing")).toBe("trialing");
  });

  it("falls back to active for anything else", () => {
    expect(statusAfterUnsuspend(undefined)).toBe("active");
    expect(statusAfterUnsuspend("deleted")).toBe("active");
  });
});

describe("extendedTrialEnd", () => {
  it("adds days to a trial end still in the future", () => {
    expect(extendedTrialEnd("2026-10-02T00:00:00Z", 7, NOW).toISOString()).toBe("2026-10-09T00:00:00.000Z");
  });

  it("counts from now when the trial end has passed or is missing", () => {
    expect(extendedTrialEnd(daysAgo(3), 7, NOW).toISOString()).toBe("2026-10-06T12:00:00.000Z");
    expect(extendedTrialEnd(null, 1, NOW).toISOString()).toBe("2026-09-30T12:00:00.000Z");
  });
});

describe("planMix", () => {
  it("groups plans, largest first", () => {
    expect(planMix(["Pro", "Starter", "Starter"])).toBe("2 Starter, 1 Pro");
    expect(planMix([])).toBe("");
  });
});

describe("input rules", () => {
  it("needs a reason and a non-zero whole credit change", () => {
    const ok = { agencyId: ID, reason: "Refund for outage", delta: -50, requestId: ID };
    expect(adjustCreditsInput.safeParse(ok).success).toBe(true);
    expect(adjustCreditsInput.safeParse({ ...ok, reason: "  " }).success).toBe(false);
    expect(adjustCreditsInput.safeParse({ ...ok, delta: 0 }).success).toBe(false);
    expect(adjustCreditsInput.safeParse({ ...ok, delta: 1.5 }).success).toBe(false);
  });

  it("extends a trial by 1 to 30 days", () => {
    const ok = { agencyId: ID, reason: "Asked for more time", days: 30 };
    expect(extendTrialInput.safeParse(ok).success).toBe(true);
    expect(extendTrialInput.safeParse({ ...ok, days: 31 }).success).toBe(false);
  });
});

describe("aiCostShare", () => {
  it("compares AI cost with revenue only when there is revenue", () => {
    expect(aiCostShare(12, { state: "ok", cents: 10_000, mode: "stripe" })).toBeCloseTo(0.12);
    expect(aiCostShare(12, { state: "ok", cents: 0, mode: "stripe" })).toBeNull();
    expect(aiCostShare(12, { state: "not_connected" })).toBeNull();
  });
});
