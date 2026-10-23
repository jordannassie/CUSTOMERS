import { describe, expect, it } from "vitest";
import type { ScoreReport } from "@/modules/scanning";
import { competitorChartsView } from "./charts";

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
        { date: "2026-10-16", scores: [35.4, 12, 55, 30, 4, 0] },
        { date: "2026-10-22", scores: [40.2, 10, 60, 30, 5, 0] },
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

  it("shows you in blue and the three strongest competitors in the greys, strongest darkest", () => {
    expect(view.series).toEqual([
      { key: "s0", name: "You Co", isYou: true, color: "var(--chart-1)" },
      { key: "s1", name: "B", isYou: false, color: "var(--chart-2)" },
      { key: "s2", name: "C", isYou: false, color: "var(--chart-3)" },
      { key: "s3", name: "A", isYou: false, color: "var(--chart-4)" },
    ]);
    expect(view.hidden).toBe(1);
  });

  it("leaves out a competitor with no score yet", () => {
    expect(view.series.map((s) => s.name)).not.toContain("Late");
  });

  it("rounds the lines and labels each scan", () => {
    expect(view.timeline).toEqual([
      { date: "2026-10-16", label: "Oct 16", s0: 35, s1: 55, s2: 30, s3: 12 },
      { date: "2026-10-22", label: "Oct 22", s0: 40, s1: 60, s2: 30, s3: 10 },
    ]);
  });

  it("folds the competitors past the top three into Other competitors for share of voice", () => {
    expect(view.share.map((s) => [s.name, s.mentions, s.share])).toEqual([
      ["You Co", 10, 28.6],
      ["B", 15, 42.9],
      ["C", 7, 20],
      ["A", 2, 5.7],
      ["Other competitors", 1, 2.9],
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
