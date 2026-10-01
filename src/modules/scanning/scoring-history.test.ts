import { describe, expect, it } from "vitest";
import { competitorWeeklyChange, modelWeeklyChanges, monthlyChange, scoreHistory } from "./scoring-periods";
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

describe("scoreHistory (DB-002)", () => {
  it("gives the 30-day score as it stood at each scan, oldest first", () => {
    const at = (daysAgo: number, hit: boolean) => MODELS.map((m) => check(m, "q1", daysAgo * 24, hit));
    // Scans 50, 20 and 2 days ago: the first misses, the others hit.
    const checks = [...at(50, false), ...at(20, true), ...at(2, true)];
    const history = scoreHistory(checks, { now: NOW, models: MODELS, days: 90 });
    expect(history.map((p) => [p.date, Math.round(p.score)])).toEqual([
      ["2026-08-08", 0],
      ["2026-09-07", 100],
      ["2026-09-25", 100],
    ]);
    // The scan 50 days ago is out of the 30-day score at the scan 20 days ago.
    expect(scoreHistory(checks, { now: NOW, models: MODELS, days: 30 })).toHaveLength(2);
  });

  it("matches today's score at the latest scan", () => {
    const checks = [...MODELS.map((m) => check(m, "q1", 40 * 24, true)), ...MODELS.map((m) => check(m, "q1", 10, m === "openai"))];
    expect(Math.round(scoreHistory(checks, { now: NOW, models: MODELS, days: 90 }).at(-1)!.score)).toBe(33);
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
