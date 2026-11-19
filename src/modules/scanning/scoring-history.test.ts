import { describe, expect, it } from "vitest";
import { visibilityScore } from "./scoring";
import { competitorWeeklyChange, modelWeeklyChanges, monthlyChange, scoreHistory, weeklyChange } from "./scoring-periods";
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

describe("changes match the 30-day scores on screen", () => {
  const DAY = 24;
  // Scans a week apart over 6 weeks on 12 questions and every model: low for weeks, then a jump in the last scan.
  const rates = [0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 1];
  const checks = rates.flatMap((rate, w) =>
    MODELS.flatMap((m) => Array.from({ length: 12 }, (_, q) => check(m, `q${q}`, (6 - w) * 7 * DAY + 1, q < Math.round(rate * 12)))),
  );
  const opts = { now: NOW, models: MODELS };
  const weekAgo = new Date(NOW.getTime() - 7 * 86_400_000);
  const shown = (at: Date) => visibilityScore(checks, { now: at, models: MODELS }).overall!;

  it("equals the 30-day score now minus the 30-day score a week ago, and never exceeds either", () => {
    const [now, before] = [shown(NOW), shown(weekAgo)];
    const change = weeklyChange(checks, opts)!;
    expect(change).not.toBeNull();
    expect(change.points).toBeCloseTo(Math.abs(now.score - before.score));
    expect(change.direction).toBe(now.score > before.score ? "up" : "down");
    expect(change.points).toBeLessThanOrEqual(Math.max(now.score, before.score));
  });

  it("matches the score-at-each-scan points a week apart", () => {
    const history = scoreHistory(checks, { ...opts, days: 90 });
    const [lastWeek, latest] = history.slice(-2);
    const change = weeklyChange(checks, opts)!;
    expect(change.points).toBeCloseTo(Math.abs(latest.score - lastWeek.score));
  });

  it("holds per model, per competitor and for the month", () => {
    for (const model of MODELS) {
      const own = (at: Date) => visibilityScore(checks, { now: at, models: [model] }).overall!.score;
      const change = modelWeeklyChanges(checks, opts)[model];
      if (change) expect(change.points).toBeCloseTo(Math.abs(own(NOW) - own(weekAgo)));
    }
    const named = checks.map((c) => ({ ...c, competitorsMentioned: c.mentioned ? [] : ["Bean House"] }));
    const rival = (at: Date) => 100 - visibilityScore(named, { now: at, models: MODELS }).overall!.score;
    const theirs = competitorWeeklyChange(named, "Bean House", opts)!;
    expect(theirs.points).toBeCloseTo(Math.abs(rival(NOW) - rival(weekAgo)));
    const month = monthlyChange(checks, opts);
    const monthAgo = new Date(NOW.getTime() - 30 * 86_400_000);
    if (month) expect(month.points).toBeCloseTo(Math.abs(shown(NOW).score - shown(monthAgo).score));
  });

  it("never shows a change inside the margin", () => {
    const flat = rates.flatMap((_, w) => MODELS.flatMap((m) => Array.from({ length: 12 }, (_, q) => check(m, `q${q}`, (6 - w) * 7 * DAY + 1, q < 6))));
    expect(weeklyChange(flat, opts)).toBeNull();
  });
});
