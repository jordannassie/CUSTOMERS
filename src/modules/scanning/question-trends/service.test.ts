import { describe, expect, it } from "vitest";
import { questionTrends, weeklyScans, type TrendCheck, type TrendQuestion, type TrendRun } from "./service";

const NOW = new Date("2026-10-13T12:00:00Z");
const daysAgo = (d: number) => new Date(NOW.getTime() - d * 86_400_000);
const run = (id: string, d: number): TrendRun => ({ id, at: daysAgo(d) });
const checks = (runId: string, promptId: string, named: string[], asked = ["openai", "anthropic", "perplexity"]): TrendCheck[] =>
  asked.map((provider) => ({ runId, promptId, provider, named: named.includes(provider) }));

const q1: TrendQuestion = { id: "q1", prompt: "Best coffee shop in Austin?", own: false };
const q2: TrendQuestion = { id: "q2", prompt: "Where to get cold brew in Austin?", own: false };
const mine: TrendQuestion = { id: "q3", prompt: "Does Epoch roast on site?", own: true };

describe("weeklyScans", () => {
  it("keeps one scan per week, the latest, the last 6 weeks, oldest first", () => {
    const runs = [run("a", 0), run("b", 1), run("c", 7), run("d", 15), run("e", 21), run("f", 28), run("g", 35), run("h", 42), run("i", 49)];
    expect(weeklyScans(runs).map((r) => r.id)).toEqual(["g", "f", "e", "d", "c", "a"]);
    expect(weeklyScans([])).toEqual([]);
  });

  it("keeps a weekly scan that ran a few hours short of 7 days apart, and shows daily scans about weekly", () => {
    expect(weeklyScans([run("now", 0), run("week", 6.9), run("two", 13.8)]).map((r) => r.id)).toEqual(["two", "week", "now"]);
    const daily = Array.from({ length: 30 }, (_, d) => run(`d${d}`, d));
    expect(weeklyScans(daily).map((r) => r.id)).toEqual(["d24", "d18", "d12", "d6", "d0"]);
  });
});

describe("questionTrends", () => {
  const runs = [run("w4", 28), run("w3", 21), run("w2", 14), run("w1", 7), run("w0", 0)];
  const saved = [
    ...checks("w4", "q1", []),
    ...checks("w3", "q1", ["openai"]),
    ...checks("w2", "q1", ["openai"]),
    ...checks("w1", "q1", ["openai", "perplexity"]),
    ...checks("w0", "q1", ["openai", "perplexity", "anthropic"]),
    ...checks("w4", "q2", ["openai", "perplexity"]),
    ...checks("w0", "q2", []),
    // Claude failed for q2 in week 1: no saved row, so it reads 1 of 2.
    ...checks("w1", "q2", ["openai"], ["openai", "perplexity"]),
    ...checks("w0", "q3", ["openai"]),
  ];

  it("shows x of n per weekly scan with an arrow against the week before", () => {
    const t = questionTrends([q1, q2, mine], runs, saved, NOW);
    expect(t.scans.map((s) => s.id)).toEqual(["w4", "w3", "w2", "w1", "w0"]);
    expect(t.rows[0].cells).toEqual([
      { named: 0, checked: 3, change: null },
      { named: 1, checked: 3, change: "up" },
      { named: 1, checked: 3, change: "same" },
      { named: 2, checked: 3, change: "up" },
      { named: 3, checked: 3, change: "up" },
    ]);
    // Not asked in weeks 3 and 2: no cell and no arrow after a gap.
    expect(t.rows[1].cells).toEqual([{ named: 2, checked: 3, change: null }, null, null, { named: 1, checked: 2, change: null }, { named: 0, checked: 3, change: "down" }]);
  });

  it("lists the user's own questions apart from the suggested ones", () => {
    const t = questionTrends([q1, q2, mine], runs, saved, NOW);
    expect(t.rows.map((r) => r.id)).toEqual(["q1", "q2"]);
    expect(t.own.map((r) => r.id)).toEqual(["q3"]);
  });

  it("names the questions that moved most over the last 4 weeks", () => {
    const t = questionTrends([q1, q2, mine], runs, saved, NOW);
    expect(t.better).toEqual([{ ...q1, now: { named: 3, checked: 3 }, then: { named: 0, checked: 3 }, thenAt: daysAgo(28), change: 1 }]);
    expect(t.worse.map((m) => [m.id, m.now, m.then])).toEqual([["q2", { named: 0, checked: 3 }, { named: 2, checked: 3 }]]);
  });

  it("leaves out paused questions, scans older than the window for movers, and has nothing before any scan", () => {
    // Only q1 is active: q2's answers are not shown.
    const t = questionTrends([q1], runs, saved, NOW);
    expect(t.rows.map((r) => r.id)).toEqual(["q1"]);
    expect(t.worse).toEqual([]);
    // Scans from 2 months ago: shown in the table, but nothing moved "in the last 4 weeks".
    const old = questionTrends([q1], [run("x", 70), run("y", 63)], [...checks("x", "q1", []), ...checks("y", "q1", ["openai"])], NOW);
    expect(old.rows[0].cells.map((c) => c?.change)).toEqual([null, "up"]);
    expect(old.better).toEqual([]);
    expect(questionTrends([q1], [], [], NOW)).toEqual({ scans: [], rows: [{ ...q1, cells: [] }], own: [], better: [], worse: [] });
  });

  it("counts a scan only for the weeks it has answers, and one AI once", () => {
    const t = questionTrends([q1], [run("empty", 3), run("w0", 0)], [...checks("w0", "q1", ["openai"]), { runId: "w0", promptId: "q1", provider: "openai", named: false }], NOW);
    expect(t.scans.map((s) => s.id)).toEqual(["w0"]);
    expect(t.rows[0].cells).toEqual([{ named: 1, checked: 3, change: null }]);
  });
});

describe("places (SHOW_POSITION, D-63)", () => {
  const q1: TrendQuestion = { id: "q1", prompt: "Best coffee shop in Austin?", own: false };
  const mine: TrendQuestion = { id: "q3", prompt: "Does Epoch roast on site?", own: true };
  const placed = (runId: string, promptId: string, positions: Record<string, number | null>): TrendCheck[] =>
    ["openai", "anthropic", "perplexity"].map((provider) => ({
      runId,
      promptId,
      provider,
      named: provider in positions,
      position: positions[provider] ?? null,
    }));
  const runs = [run("old", 40), run("w1", 7), run("w0", 0)];
  const saved = [
    ...placed("old", "q1", { openai: 9 }),
    ...placed("w1", "q1", { openai: 3 }),
    ...placed("w0", "q1", { openai: 2, perplexity: null }),
    ...placed("w0", "q3", { openai: 1 }),
  ];

  it("leaves places out unless asked for", () => {
    const t = questionTrends([q1, mine], runs, saved, NOW);
    expect(t.rows[0]).not.toHaveProperty("place");
    expect(t).not.toHaveProperty("averagePlace");
  });

  it("gives each question its place at the newest scan, and the 30-day average for suggested questions", () => {
    const t = questionTrends([q1, mine], runs, saved, NOW, { places: true });
    expect(t.rows[0].place).toEqual({ named: true, positions: [2] });
    expect(t.own[0].place).toEqual({ named: true, positions: [1] });
    // 3 (a week ago) and 2 (today); the scan 40 days ago and the user's own question are left out.
    expect(t.averagePlace).toEqual({ value: 2.5, answers: 2 });
  });
});
