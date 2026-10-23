import { describe, expect, it } from "vitest";
import {
  hasSomethingToReport,
  lowCreditsKey,
  MAX_NEW_OPPORTUNITIES,
  weekOf,
  weeklyBusiness,
  weeklyReportKey,
  weeklyReportSubject,
} from "./service";

const AGENCY = "7f3c2a9e-2d4b-4c1a-9a6e-1b2c3d4e5f60";

describe("keys", () => {
  it("gives every day of a week the same Monday, and the next Monday a new one", () => {
    expect(weekOf(new Date("2026-09-28T00:00:00Z"))).toBe("2026-09-28");
    expect(weekOf(new Date("2026-10-04T23:59:59Z"))).toBe("2026-09-28");
    expect(weekOf(new Date("2026-10-05T13:00:00Z"))).toBe("2026-10-05");
    expect(weeklyReportKey(AGENCY, new Date("2026-09-30T10:00:00Z"))).toBe(`weekly_report:${AGENCY}:2026-09-28`);
  });

  it("keys low credits by level and period, so each level sends once per period", () => {
    const now = new Date("2026-09-29T10:00:00Z");
    const periodEnd = new Date("2026-10-02T00:00:00Z");
    const low = lowCreditsKey({ agencyId: AGENCY, level: "low", periodEnd }, now);
    expect(low).toBe(`low_credits:${AGENCY}:2026-10-02T00:00:00.000Z:low`);
    expect(lowCreditsKey({ agencyId: AGENCY, level: "empty", periodEnd }, now)).not.toBe(low);
    expect(lowCreditsKey({ agencyId: AGENCY, level: "low", periodEnd: new Date("2026-11-02T00:00:00Z") }, now)).not.toBe(low);
    expect(lowCreditsKey({ agencyId: AGENCY, level: "empty", periodEnd: null }, now)).toBe(`low_credits:${AGENCY}:2026-09:empty`);
  });
});

const score = (change: { direction: "up" | "down"; text: string } | null) => ({
  score: {
    value: 64,
    tone: "mid" as const,
    label: "Good confidence",
    sentence: "AI recommended you in about 6 of 10 customer questions this month.",
    firstResults: false,
    change,
    details: {} as never,
  },
});

describe("weeklyBusiness", () => {
  it("shows the Overview's change (already past the margin), and new fixes most important first", () => {
    const business = weeklyBusiness({
      name: "Bean There Coffee",
      overview: score({ direction: "up", text: "Up 8 points on last week" }),
      newOpportunities: [
        { title: "Low one", impact: "low", createdAt: "2026-09-27T00:00:00Z" },
        { title: "High older", impact: "high", createdAt: "2026-09-23T00:00:00Z" },
        { title: "High newer", impact: "high", createdAt: "2026-09-28T00:00:00Z" },
        { title: "Medium", impact: "medium", createdAt: "2026-09-28T00:00:00Z" },
      ],
      reportPath: "/r/token",
    });
    expect(business).toEqual({
      name: "Bean There Coffee",
      score: 64,
      sentence: "AI recommended you in about 6 of 10 customer questions this month.",
      change: { direction: "up", text: "Up 8 points on last week" },
      newOpportunities: ["High newer", "High older", "Medium"],
      moreOpportunities: 1,
      reportUrl: "/r/token",
    });
    expect(business.newOpportunities).toHaveLength(MAX_NEW_OPPORTUNITIES);
  });

  it("has no change when the Overview has none, and nothing to report without a score", () => {
    const steady = weeklyBusiness({ name: "A", overview: score(null), newOpportunities: [], reportPath: "/r/a" });
    const unscored = weeklyBusiness({ name: "B", overview: null, newOpportunities: [], reportPath: "/dashboard" });
    expect(steady.change).toBeNull();
    expect(unscored).toMatchObject({ score: null, sentence: null, change: null });
    expect(hasSomethingToReport([unscored])).toBe(false);
    expect(hasSomethingToReport([unscored, steady])).toBe(true);
  });

  it("writes a subject that says what moved", () => {
    const moved = weeklyBusiness({ name: "A", overview: score({ direction: "down", text: "Down 9 points on last week" }), newOpportunities: [], reportPath: "/r/a" });
    const steady = weeklyBusiness({ name: "B", overview: score(null), newOpportunities: [], reportPath: "/r/b" });
    expect(weeklyReportSubject([moved])).toBe("Your weekly report for A");
    expect(weeklyReportSubject([moved, steady])).toBe("Your weekly report: 1 of 2 businesses moved");
    expect(weeklyReportSubject([steady, steady])).toBe("Your weekly report: 2 businesses, no big moves");
  });
});
