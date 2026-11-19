import { describe, expect, it } from "vitest";
import { countsInScore, isOwnQuestion, ownQuestionsResult, splitByQuestion } from "./counted";

// BUG-129: only suggested questions that are active now count in the score.
const NOW = new Date("2026-10-12T12:00:00Z");
const daysAgo = (d: number) => new Date(NOW.getTime() - d * 86_400_000);

const questions = [
  { id: "suggested", source: "library", active: true },
  { id: "paused", source: "library", active: false },
  { id: "mine", source: "custom", active: true },
  { id: "old", source: "legacy", active: true },
  { id: "mine-paused", source: "custom", active: false },
];

describe("countsInScore", () => {
  it("counts an active suggested question only", () => {
    expect(questions.filter(countsInScore).map((q) => q.id)).toEqual(["suggested"]);
  });

  it("treats old prompts kept from before the library as the user's own", () => {
    expect(["library", "custom", "legacy"].map(isOwnQuestion)).toEqual([false, true, true]);
  });
});

describe("splitByQuestion", () => {
  it("leaves out paused, removed and unlinked questions, and keeps active own ones apart", () => {
    const checks = ["suggested", "paused", "mine", "old", "mine-paused", "removed", "none"].map((questionId) => ({ questionId }));
    const { scored, own } = splitByQuestion(checks, questions);
    expect(scored.map((c) => c.questionId)).toEqual(["suggested"]);
    expect(own.map((c) => c.questionId)).toEqual(["mine", "old"]);
  });
});

describe("ownQuestionsResult", () => {
  const check = (mentioned: boolean, provider: "openai" | "anthropic" = "openai", at = daysAgo(1)) => ({
    provider,
    checkedAt: at,
    mentioned,
  });

  it("counts answers from the chosen AIs in the last 30 days", () => {
    const own = [check(true), check(false), check(true, "anthropic"), check(true, "openai", daysAgo(31))];
    expect(ownQuestionsResult(own, { now: NOW, models: ["openai"] })).toEqual({ named: 1, answers: 2 });
  });

  it("is null when there are no answers", () => {
    expect(ownQuestionsResult([], { now: NOW, models: ["openai"] })).toBeNull();
  });
});
