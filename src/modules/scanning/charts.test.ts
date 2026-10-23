import { describe, expect, it } from "vitest";
import { competitorCharts } from "./charts";
import { competitorScores, visibilityScore, type ScoreCheck } from "./scoring";

const NOW = new Date("2026-10-23T12:00:00Z");
const day = (n: number) => new Date(NOW.getTime() - n * 86_400_000);
let k = 0;
function check(daysAgo: number, provider: ScoreCheck["provider"], mentioned: boolean, rivals: string[] = []): ScoreCheck {
  k++;
  return { provider, questionId: `q${k % 4}`, checkedAt: day(daysAgo), mentioned, competitorsMentioned: rivals, answerKey: `a${k}` };
}

// Two scans, 7 days apart, on ChatGPT and Claude.
const checks: ScoreCheck[] = [
  check(8, "openai", true, ["Rival Roasters"]),
  check(8, "openai", false, ["Rival Roasters", "Daily Grind"]),
  check(8, "anthropic", false, ["Daily Grind"]),
  check(8, "anthropic", false, []),
  check(1, "openai", true, []),
  check(1, "openai", true, ["Rival Roasters"]),
  check(1, "anthropic", false, ["rival roasters"]),
  check(1, "anthropic", true, []),
];
const opts = { now: NOW, models: ["openai", "anthropic"] as const };

describe("competitorCharts", () => {
  const charts = competitorCharts(checks, "Bean There", ["Rival Roasters", "Daily Grind"], opts);

  it("names you first, then the competitors in order", () => {
    expect(charts.names).toEqual(["Bean There", "Rival Roasters", "Daily Grind"]);
  });

  it("has one point per scan day, and the last one is the leaderboard score", () => {
    expect(charts.timeline.map((p) => p.date)).toEqual([day(8).toISOString().slice(0, 10), day(1).toISOString().slice(0, 10)]);
    const last = charts.timeline.at(-1)!.scores;
    expect(last[0]).toBeCloseTo(visibilityScore(checks, opts).overall!.score);
    const rivals = competitorScores(checks, ["Rival Roasters", "Daily Grind"], opts);
    expect(last[1]).toBeCloseTo(rivals[0].estimate.score);
    expect(last[2]).toBeCloseTo(rivals[1].estimate.score);
  });

  it("counts each business's mentions in the window, with shares adding up to 100", () => {
    expect(charts.share.map((s) => s.mentions)).toEqual([4, 4, 2]);
    expect(charts.share.reduce((sum, s) => sum + s.share, 0)).toBeCloseTo(100);
    expect(charts.share[2].share).toBeCloseTo(20);
  });

  it("scores each business per model, and leaves a model with no checks empty", () => {
    const withPerplexity = competitorCharts(checks, "Bean There", ["Rival Roasters"], { now: NOW, models: ["openai", "perplexity"] });
    expect(withPerplexity.byModel.map((m) => m.model)).toEqual(["openai", "perplexity"]);
    expect(withPerplexity.byModel[0].scores[0]).toBeGreaterThan(0);
    expect(withPerplexity.byModel[1].scores).toEqual([null, null]);
  });

  it("has no share when nothing was named", () => {
    const quiet = competitorCharts([check(1, "openai", false)], "Bean There", ["Rival Roasters"], opts);
    expect(quiet.share).toEqual([{ mentions: 0, share: 0 }, { mentions: 0, share: 0 }]);
  });
});
