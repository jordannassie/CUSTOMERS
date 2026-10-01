import { describe, expect, it } from "vitest";
import { competitorWeeklyChange, modelWeeklyChanges, monthlyChange, scanSeries } from "./scoring-periods";
import { check, MODELS, NOW } from "./scoring.test-helpers";

// Per-scan and month-on-month numbers (DB-001, DB-012). The scores themselves are tested in scoring.test.ts.

describe("monthlyChange", () => {
  it("compares the last 30 days with the 30 before, only when the gap beats the margin", () => {
    const month = (daysAgo: number, hit: (q: number) => boolean) =>
      MODELS.flatMap((m) => Array.from({ length: 12 }, (_, q) => check(m, `q${q}`, daysAgo * 24, hit(q))));
    const rise = [...month(40, (q) => q < 2), ...month(35, (q) => q < 3), ...month(10, (q) => q < 10), ...month(3, (q) => q < 11)];
    expect(monthlyChange(rise, { now: NOW, models: MODELS })).toMatchObject({ direction: "up" });
    const flat = [...month(40, (q) => q < 6), ...month(10, (q) => q < 6)];
    expect(monthlyChange(flat, { now: NOW, models: MODELS })).toBeNull();
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

describe("weekly changes per model and competitor (DB-013)", () => {
  // 12 questions on one model in each week; `hit` decides the mentions.
  const week = (model: (typeof MODELS)[number], hoursAgo: number, hit: (q: number) => boolean, names: string[] = []) =>
    Array.from({ length: 12 }, (_, q) => check(model, `q${q}`, hoursAgo, hit(q), { competitorsMentioned: hit(q) ? [] : names }));

  it("gives a model its change only when it beats that model's margin", () => {
    const checks = [
      ...week("openai", 10 * 24, (q) => q < 2),
      ...week("openai", 2 * 24, (q) => q < 11),
      ...week("anthropic", 10 * 24, (q) => q < 6),
      ...week("anthropic", 2 * 24, (q) => q < 7),
    ];
    const changes = modelWeeklyChanges(checks, { now: NOW, models: MODELS });
    expect(changes.openai).toMatchObject({ direction: "up" });
    expect(changes.anthropic).toBeUndefined();
    expect(changes.perplexity).toBeUndefined();
  });

  it("follows how often AI named a competitor", () => {
    const checks = [...week("openai", 10 * 24, () => true, ["Bean House"]), ...week("openai", 2 * 24, () => false, ["Bean House"])];
    expect(competitorWeeklyChange(checks, "bean house", { now: NOW, models: ["openai"] })).toMatchObject({ direction: "up" });
  });
});
