import { describe, expect, it } from "vitest";
import type { ReportSnapshot } from "@/modules/reports";
import {
  aiToolNames,
  hasSomethingToReport,
  lowCreditsKey,
  MAX_FIXES,
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

// Only the parts of a report snapshot the weekly email reads.
const fix = (n: number) => ({ n, title: `Fix ${n}`, where: n === 1 ? "Your website" : "Google Business Profile" });
const report = (change: { direction: "up" | "down"; points: number } | null, fixes = 4) =>
  ({
    score: { value: 64, change, rangePoints: 8 },
    named: { answers: 23, total: 36, questions: 10, questionsAsked: 12 },
    rank: { position: 2, of: 4, leader: { name: "Bean House", score: 70 } },
    summary: { headline: "AI named Bean There Coffee in 23 of 36 answers.", lead: "", short: { knows: "", behind: "Bean House is named more often.", fixes: "" } },
    fixes: Array.from({ length: fixes }, (_, i) => fix(i + 1)),
  }) as unknown as ReportSnapshot;

describe("weeklyBusiness", () => {
  it("takes every number from the business's report, with its top fixes and where each is made", () => {
    const business = weeklyBusiness({ name: "Bean There Coffee", snapshot: report({ direction: "up", points: 8 }), sharePath: "/r/token" });
    expect(business).toMatchObject({
      name: "Bean There Coffee",
      score: 64,
      named: { answers: 23, total: 36 },
      rank: { position: 2, of: 4 },
      sentence: "AI named Bean There Coffee in 23 of 36 answers.",
      reason: "Bean House is named more often.",
      change: { direction: "up", text: "Up 8 points on the 30 days before" },
      fixes: [fix(1), fix(2), fix(3)].map(({ title, where }) => ({ title, where })),
      moreFixes: 1,
      reportUrl: "/r/token",
      pdf: true,
      aiTools: ["ChatGPT", "Claude", "Perplexity"],
    });
    expect(business.fixes).toHaveLength(MAX_FIXES);
  });

  it("links to the dashboard when the share link is off, and has nothing to report without a report", () => {
    const off = weeklyBusiness({ name: "A", snapshot: report(null, 0), sharePath: null });
    expect(off).toMatchObject({ reportUrl: "/dashboard", pdf: false, change: null, fixes: [], moreFixes: 0 });
    const unscored = weeklyBusiness({ name: "B", snapshot: null, sharePath: "/r/b" });
    expect(unscored).toMatchObject({ score: null, sentence: null, reason: null, change: null, reportUrl: "/dashboard", pdf: false });
    expect(hasSomethingToReport([unscored])).toBe(false);
    expect(hasSomethingToReport([unscored, off])).toBe(true);
  });

  it("says one point, not one points", () => {
    expect(weeklyBusiness({ name: "A", snapshot: report({ direction: "down", points: 1 }), sharePath: null }).change?.text).toBe(
      "Down 1 point on the 30 days before",
    );
  });

  it("writes a subject that says what moved", () => {
    const moved = weeklyBusiness({ name: "A", snapshot: report({ direction: "down", points: 9 }), sharePath: "/r/a" });
    const steady = weeklyBusiness({ name: "B", snapshot: report(null), sharePath: "/r/b" });
    expect(weeklyReportSubject([moved])).toBe("Your weekly report for A");
    expect(weeklyReportSubject([moved, steady])).toBe("Your weekly report: 1 of 2 businesses moved");
    expect(weeklyReportSubject([steady, steady])).toBe("Your weekly report: 2 businesses, no big moves");
  });
});

describe("aiToolNames", () => {
  it("names the business's chosen AI tools in the usual order, and all three when none are saved", () => {
    expect(aiToolNames(["perplexity", "openai"])).toEqual(["ChatGPT", "Perplexity"]);
    expect(aiToolNames(["anthropic"])).toEqual(["Claude"]);
    expect(aiToolNames([])).toEqual(["ChatGPT", "Claude", "Perplexity"]);
    expect(aiToolNames(null)).toEqual(["ChatGPT", "Claude", "Perplexity"]);
  });
});
