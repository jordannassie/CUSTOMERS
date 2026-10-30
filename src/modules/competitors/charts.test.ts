import { describe, expect, it } from "vitest";
import type { ScoreReport } from "@/modules/scanning";
import { competitorChartsView, isFirstScan, pickShares } from "./charts";
import type { LeaderRow } from "./service";

const names = ["You Co", "A", "B", "C", "D", "Late"];
function report(overrides: Partial<ScoreReport> = {}): ScoreReport {
  return {
    overall: { score: 40, margin: 10, checks: 30, uniqueAnswers: 30, confidence: "early" },
    competitors: [
      { name: "A", score: 10, standing: "behind", change: null },
      { name: "B", score: 60, standing: "ahead", change: null },
      { name: "C", score: 30, standing: "about_same", change: null },
      { name: "D", score: 5, standing: "behind", change: null },
      { name: "Late", score: 0, standing: "behind", change: null },
    ],
    charts: {
      names,
      timeline: [
        { date: "2026-10-16", scores: [35.4, 12, 55, 30, 4, 0], rolling: [20, 11, 50, 31, 4, 0] },
        { date: "2026-10-22", scores: [40.2, 10, 60, 30, 5, 0], rolling: [22.6, 11, 52, 30, 4, 0] },
      ],
      share: [10, 2, 15, 7, 1, 0].map((mentions) => ({ mentions, share: 0 })),
      byModel: [{ model: "openai", scores: [50, 10, 70, 30, 5, 0] }, { model: "anthropic", scores: [null, null, null, null, null, null] }],
    },
    ...overrides,
  } as ScoreReport;
}
const scored = new Set(["A", "B", "C", "D"]);

describe("competitorChartsView", () => {
  const view = competitorChartsView(report(), scored)!;

  it("shows you in blue and the three strongest competitors each in its own color, strongest first", () => {
    expect(view.series).toEqual([
      { key: "s0", name: "You Co", isYou: true, color: "var(--chart-1)" },
      { key: "s1", name: "B", isYou: false, color: "var(--cd-series-2)" },
      { key: "s2", name: "C", isYou: false, color: "var(--cd-series-3)" },
      { key: "s3", name: "A", isYou: false, color: "var(--cd-series-4)" },
    ]);
    expect(view.hidden).toBe(1);
  });

  it("leaves out a competitor with no score yet", () => {
    expect(view.series.map((s) => s.name)).not.toContain("Late");
  });

  it("rounds each scan's own rate and its 30-day reference, and labels each scan", () => {
    expect(view.timeline).toEqual([
      { date: "2026-10-16", label: "Oct 16", s0: 35, s1: 55, s2: 30, s3: 12, rs0: 20, rs1: 50, rs2: 31, rs3: 11 },
      { date: "2026-10-22", label: "Oct 22", s0: 40, s1: 60, s2: 30, s3: 10, rs0: 23, rs1: 52, rs2: 30, rs3: 11 },
    ]);
  });

  it("folds the competitors past the top three into Other competitors for share of voice", () => {
    expect(view.share.map((s) => [s.name, s.mentions, s.share])).toEqual([
      ["You Co", 10, 29],
      ["B", 15, 43],
      ["C", 7, 20],
      ["A", 2, 6],
      ["Other competitors", 1, 3],
    ]);
    expect(view.mentions).toBe(35);
  });

  it("labels each AI model and keeps a model with no checks empty", () => {
    expect(view.byModel).toEqual([
      { model: "ChatGPT", s0: 50, s1: 70, s2: 30, s3: 10 },
      { model: "Claude", s0: null, s1: null, s2: null, s3: null },
    ]);
  });

  it("is null without chart data or before the first score", () => {
    expect(competitorChartsView(report({ charts: undefined }), scored)).toBeNull();
    expect(competitorChartsView(report({ overall: null }), scored)).toBeNull();
  });
});

describe("colors follow the leaderboard", () => {
  it("gives each competitor the color of its place on the leaderboard, on every page", () => {
    const ordered = competitorChartsView(report(), scored, ["A", "B", "C", "D"])!;
    expect(ordered.series.map((x) => [x.name, x.color])).toEqual([
      ["You Co", "var(--chart-1)"],
      ["A", "var(--cd-series-2)"],
      ["B", "var(--cd-series-3)"],
      ["C", "var(--cd-series-4)"],
    ]);
  });
});

describe("pickShares", () => {
  const check = (youNamed: boolean, competitors: string[]) => ({ provider: "openai", questionId: "q", youNamed, competitors, extracted: null, sites: [] }) as never;
  const row = (name: string, score: number | null, over: Partial<LeaderRow> = {}): LeaderRow => ({ name, isYou: false, score, standing: "behind", collecting: false, change: null, shade: 1, ...over });
  const leaderboard = [
    row("Bennu Coffee on Congress", 60, { chain: { brand: "Bennu Coffee", tracked: ["Bennu Coffee on Congress", "Bennu Coffee on 6th"] } }),
    row("A", 40),
    row("B", 30),
    row("C", 20),
    row("You Co", 10, { isYou: true, standing: null }),
  ];
  // An answer naming two branches of one chain counts once for the chain, as the Overview and the report count it.
  const checks = [check(true, ["Bennu Coffee on Congress", "Bennu Coffee on 6th"]), check(false, ["Bennu Coffee on 6th", "A"]), check(true, ["C"]), check(false, ["B"])];
  const view = pickShares(competitorChartsView(report(), scored)!, leaderboard, checks);

  it("gives you the same share as the Overview's rule, a chain as one slice, and the rest as Other competitors", () => {
    expect(view.share.map((s) => [s.name, s.mentions, s.share])).toEqual([
      ["You Co", 2, 29],
      ["Bennu Coffee (all locations)", 2, 29],
      ["A", 1, 14],
      ["B", 1, 14],
      ["Other competitors", 1, 14],
    ]);
    expect(view.mentions).toBe(7);
  });

  it("keeps each competitor's leaderboard color", () => {
    expect(view.share.find((s) => s.name === "A")?.color).toBe("var(--cd-series-3)");
    expect(view.share.find((s) => s.isYou)?.color).toBe("var(--chart-1)");
  });
});

describe("isFirstScan", () => {
  const day = (date: string) => ({ date, scores: [10], rolling: [10] });
  const report = (days: string[], prevAnswers: number, firstCheckedAt: string | null) =>
    ({ charts: { timeline: days.map(day), period: { prevAnswers } }, firstCheckedAt: firstCheckedAt && new Date(firstCheckedAt) }) as unknown as ScoreReport;

  it("is true for one scan day with nothing before it", () => {
    expect(isFirstScan(report(["2026-10-30"], 0, "2026-10-30T09:00:00Z"))).toBe(true);
  });

  it("is false with answers in the period before the chart, or an earlier check in the window", () => {
    expect(isFirstScan(report(["2026-10-30"], 36, "2026-10-30T09:00:00Z"))).toBe(false);
    expect(isFirstScan(report(["2026-10-30"], 0, "2026-10-12T09:00:00Z"))).toBe(false);
  });

  it("is false once there are two scan days", () => {
    expect(isFirstScan(report(["2026-10-23", "2026-10-30"], 0, "2026-10-23T09:00:00Z"))).toBe(false);
  });
});
