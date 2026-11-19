import { describe, expect, it } from "vitest";
import { visibilityScore, type ScoreCheck } from "../scoring";
import { scoreHistory, weeklyChange } from "../scoring-periods";
import { splitByQuestion } from "./counted";

// Step 9e: removing or pausing a question changes the score from then on, never the scores read before.
const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date("2026-10-13T12:00:00Z");
const ago = (days: number) => new Date(NOW.getTime() - days * DAY);
const models = ["openai"] as const;

// Each question asked once a day for 20 days: "kept" never names the business, "removed" always did.
const checks: (ScoreCheck & { questionId: string })[] = Array.from({ length: 20 }, (_, d) => [
  { provider: "openai" as const, questionId: "kept", checkedAt: ago(d + 0.5), mentioned: false, competitorsMentioned: [], answerKey: `k${d}` },
  { provider: "openai" as const, questionId: "removed", checkedAt: ago(d + 0.5), mentioned: true, competitorsMentioned: [], answerKey: `r${d}` },
]).flat();

const questions = [
  { id: "kept", source: "library", active: true, inactiveSince: null },
  { id: "removed", source: "library", active: false, inactiveSince: ago(2).toISOString() },
];

describe("a question stopped later (step 9e)", () => {
  it("is left out of today's score, as BUG-129 says", () => {
    const now = splitByQuestion(checks, questions).scored;
    expect(visibilityScore(now, { now: NOW, models }).overall?.score).toBe(0);
  });

  it("still counts in scores read before it stopped, so past points stay as they were", () => {
    const all = splitByQuestion(checks, questions, { history: true }).scored;
    const before = visibilityScore(all, { now: ago(3), models }).overall!.score;
    expect(before).toBe(50);
    const history = scoreHistory(all, { now: NOW, models, days: 10 });
    expect(history.find((p) => p.date === ago(3.5).toISOString().slice(0, 10))?.score).toBe(50);
    // From the day it stopped, the same history reads only the questions still asked.
    expect(history.at(-1)?.score).toBe(0);
  });

  it("does not count a question stopped before this was recorded, as before", () => {
    const unknown = questions.map((q) => (q.id === "removed" ? { ...q, inactiveSince: null } : q));
    const all = splitByQuestion(checks, unknown, { history: true }).scored;
    expect(visibilityScore(all, { now: ago(3), models }).overall?.score).toBe(0);
    expect(weeklyChange(all, { now: NOW, models })).toBeNull();
  });
});
