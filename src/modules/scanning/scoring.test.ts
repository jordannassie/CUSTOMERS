import { describe, expect, it } from "vitest";
import type { ProviderId } from "./providers/types";
import {
  compareWithCompetitor,
  competitorScores,
  confidenceLabel,
  isRealChange,
  scanSeries,
  trendSeries,
  visibilityScore,
  weeklyChange,
  type ScoreCheck,
} from "./scoring";
import { check, MODELS, NOW } from "./scoring.test-helpers";

function series(provider: ProviderId, mentions: number, total: number, extra: Partial<ScoreCheck> = {}): ScoreCheck[] {
  return Array.from({ length: total }, (_, i) => check(provider, `q${i}`, 1 + i, i < mentions, extra));
}

/** 12 questions on each model, `perQuestion` scans each, half of them mentioning the business. */
function scans(perQuestion: number): ScoreCheck[] {
  return MODELS.flatMap((model) =>
    Array.from({ length: 12 }, (_, q) =>
      Array.from({ length: perQuestion }, (_, s) => check(model, `q${q}`, 1 + s * 20, (q + s) % 2 === 0)),
    ).flat(),
  );
}

describe("visibilityScore", () => {
  it("is mentions divided by checks, as 0 to 100", () => {
    const checks = [...series("openai", 6, 10), ...series("anthropic", 6, 10), ...series("perplexity", 6, 10)];
    const result = visibilityScore(checks, { now: NOW, models: MODELS });
    expect(result.overall?.score).toBeCloseTo(60);
    expect(result.overall?.checks).toBe(30);
    expect(result.byModel.map((m) => [m.model, m.estimate.score])).toEqual([
      ["openai", 60],
      ["anthropic", 60],
      ["perplexity", 60],
    ]);
  });

  it("weights each chosen model equally, whatever its number of checks (D-65)", () => {
    const checks = [...series("openai", 8, 10), ...series("anthropic", 1, 2)];
    const result = visibilityScore(checks, { now: NOW, models: MODELS });
    // 80 and 50, not 9 of 12 (75).
    expect(result.overall?.score).toBeCloseTo(65);
    expect(result.byModel.map((m) => m.model)).toEqual(["openai", "anthropic"]);
  });

  it("counts only the last 30 days and only the chosen models", () => {
    const checks = [
      check("openai", "q1", 29 * 24, true),
      check("openai", "q1", 31 * 24, false),
      check("openai", "q2", 1, true),
      check("perplexity", "q1", 1, false),
    ];
    const result = visibilityScore(checks, { now: NOW, models: ["openai"] });
    expect(result.overall?.score).toBe(100);
    expect(result.overall?.checks).toBe(2);
  });

  it("has no score before the first check", () => {
    expect(visibilityScore([], { now: NOW, models: MODELS })).toEqual({
      overall: null,
      byModel: [],
    });
  });
});

describe("margin of error", () => {
  // MVP_SPEC 5.6 rough guide at 12 questions by 3 models over 30 days.
  it.each([
    ["monthly scans", 1, 15.4],
    ["weekly scans", 4, 8.2],
    ["daily scans", 30, 3.0],
  ])("matches the spec's guide for %s", (_, perQuestion, margin) => {
    const result = visibilityScore(scans(perQuestion), {
      now: NOW,
      models: MODELS,
    });
    expect(result.overall?.margin).toBeCloseTo(margin, 1);
  });

  it("counts a cached answer once, however many checks reused it", () => {
    const fresh = series("openai", 5, 10);
    const reused = series("openai", 5, 10).map((c) => ({
      ...c,
      questionId: "q0",
      answerKey: c.mentioned ? "yes" : "no",
    }));
    const a = visibilityScore(fresh, { now: NOW, models: ["openai"] }).overall!;
    const b = visibilityScore(reused, {
      now: NOW,
      models: ["openai"],
    }).overall!;
    expect(b.score).toBe(a.score);
    expect(a.uniqueAnswers).toBe(10);
    expect(b.uniqueAnswers).toBe(2);
    expect(b.margin).toBeGreaterThan(a.margin);
  });

  it("never claims zero spread, even when every answer agrees", () => {
    const result = visibilityScore(series("openai", 10, 10), {
      now: NOW,
      models: ["openai"],
    });
    expect(result.overall?.margin).toBeGreaterThan(0);
  });
});

describe("confidence labels", () => {
  it.each([
    [0, "early"],
    [49, "early"],
    [50, "good"],
    [200, "good"],
    [201, "high"],
  ] as const)("%i unique answers is %s", (n, label) => {
    expect(confidenceLabel(n)).toBe(label);
  });

  it("labels the score from its unique answers", () => {
    expect(visibilityScore(scans(1), { now: NOW, models: MODELS }).overall?.confidence).toBe("early");
    expect(visibilityScore(scans(4), { now: NOW, models: MODELS }).overall?.confidence).toBe("good");
    expect(visibilityScore(scans(30), { now: NOW, models: MODELS }).overall?.confidence).toBe("high");
  });
});

describe("isRealChange", () => {
  it("is true only when the gap is larger than the combined margin", () => {
    // Combined margin of two 5 point margins is about 7.07.
    expect(isRealChange({ score: 60, margin: 5 }, { score: 67, margin: 5 })).toBe(false);
    expect(isRealChange({ score: 60, margin: 5 }, { score: 68, margin: 5 })).toBe(true);
    expect(isRealChange({ score: 68, margin: 5 }, { score: 60, margin: 5 })).toBe(true);
    expect(isRealChange({ score: 60, margin: 0 }, { score: 60, margin: 0 })).toBe(false);
  });
});

describe("competitor comparison", () => {
  it("says ahead, behind or about the same using the margin", () => {
    expect(compareWithCompetitor({ score: 70, margin: 5 }, { score: 50, margin: 5 })).toBe("ahead");
    expect(compareWithCompetitor({ score: 50, margin: 5 }, { score: 70, margin: 5 })).toBe("behind");
    expect(compareWithCompetitor({ score: 55, margin: 5 }, { score: 50, margin: 5 })).toBe("about_same");
  });

  it("scores each competitor on the same checks", () => {
    const checks = scans(4).map((c, i) => ({
      ...c,
      mentioned: i % 5 !== 0,
      competitorsMentioned: [i % 5 === 0 ? "Rival Roasters" : "", i % 2 === 0 ? "Close Call Cafe" : ""].filter(Boolean),
    }));
    const result = competitorScores(checks, ["rival roasters", "Close Call Cafe", "Nobody"], {
      now: NOW,
      models: MODELS,
    });
    expect(result.map((r) => [r.name, Math.round(r.estimate.score), r.standing])).toEqual([
      ["rival roasters", 20, "ahead"],
      ["Close Call Cafe", 50, "ahead"],
      ["Nobody", 0, "ahead"],
    ]);
    const even = competitorScores(
      checks.map((c) => ({
        ...c,
        competitorsMentioned: c.mentioned ? ["Twin"] : [],
      })),
      ["Twin"],
      { now: NOW, models: MODELS },
    );
    expect(even[0].standing).toBe("about_same");
  });

  it("compares nothing before the business has a score", () => {
    expect(competitorScores([], ["Rival"], { now: NOW, models: MODELS })).toEqual([]);
  });
});

describe("scanSeries", () => {
  it("gives each scan day its own estimate, oldest first, and skips days outside the window", () => {
    const checks = [
      check("openai", "q1", 31 * 24, true),
      check("openai", "q1", 7 * 24, false),
      check("anthropic", "q1", 7 * 24, false),
      check("openai", "q1", 1, true),
      check("anthropic", "q1", 1, false),
    ];
    const points = scanSeries(checks, { now: NOW, models: MODELS });
    expect(points.map((p) => [p.date, p.score])).toEqual([
      ["2026-09-20", 0],
      ["2026-09-27", 50],
    ]);
    expect(points[1].margin).toBeGreaterThan(0);
  });
});

describe("trendSeries", () => {
  it("gives the last 7 UTC days, oldest first, equal weight per model", () => {
    const checks = [
      check("openai", "q1", 0, true),
      check("anthropic", "q1", 0, false),
      check("anthropic", "q2", 0, false),
      check("openai", "q1", 6 * 24, true),
      check("openai", "q1", 7 * 24, true),
    ];
    const points = trendSeries(checks, { now: NOW, models: MODELS });
    expect(points.map((p) => p.date)).toEqual([
      "2026-09-21",
      "2026-09-22",
      "2026-09-23",
      "2026-09-24",
      "2026-09-25",
      "2026-09-26",
      "2026-09-27",
    ]);
    expect(points[6]).toEqual({ date: "2026-09-27", score: 50, checks: 3 });
    expect(points[0]).toEqual({ date: "2026-09-21", score: 100, checks: 1 });
    expect(points[3]).toEqual({ date: "2026-09-24", score: null, checks: 0 });
  });
});

describe("weeklyChange", () => {
  const week = (mentions: number, total: number, hoursAgo: number) =>
    MODELS.flatMap((model) =>
      Array.from({ length: total }, (_, i) => check(model, `q${i}`, hoursAgo, i < mentions)),
    );

  it("shows up or down only when the gap between the two weeks is larger than the margin", () => {
    const up = weeklyChange([...week(10, 40, 8 * 24), ...week(30, 40, 24)], { now: NOW, models: MODELS });
    expect(up?.direction).toBe("up");
    expect(up?.points).toBeCloseTo(50);
    const down = weeklyChange([...week(30, 40, 8 * 24), ...week(10, 40, 24)], { now: NOW, models: MODELS });
    expect(down?.direction).toBe("down");
  });

  it("is null for a small change, or without a week to compare with", () => {
    expect(weeklyChange([...week(20, 40, 8 * 24), ...week(22, 40, 24)], { now: NOW, models: MODELS })).toBeNull();
    expect(weeklyChange(week(30, 40, 24), { now: NOW, models: MODELS })).toBeNull();
    expect(weeklyChange([], { now: NOW, models: MODELS })).toBeNull();
  });
});
