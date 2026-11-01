import { describe, expect, it } from "vitest";
import type { ProviderId } from "./providers/types";
import { competitorScores, visibilityScore, type ScoreCheck } from "./scoring";
import { check, MODELS, NOW } from "./scoring.test-helpers";

// The overall score pools every chosen AI tool's answers (D-91, replacing the equal-weight average of D-65).

function series(provider: ProviderId, mentions: number, total: number, extra: Partial<ScoreCheck> = {}): ScoreCheck[] {
  return Array.from({ length: total }, (_, i) => check(provider, `q${i}`, 1 + i, i < mentions, extra));
}

describe("pooled visibility score (D-91)", () => {
  it("gives 2 of 12 for ChatGPT 1 of 10 and Claude 1 of 2, not the average of 10 and 50", () => {
    const checks = [...series("openai", 1, 10), ...series("anthropic", 1, 2)];
    const result = visibilityScore(checks, { now: NOW, models: MODELS });
    expect(result.overall?.score).toBeCloseTo(16.7, 1);
    expect(result.overall?.checks).toBe(12);
    expect(result.overall?.uniqueAnswers).toBe(12);
    // Each AI tool keeps its own rate.
    expect(result.byModel.map((m) => [m.model, m.estimate.score])).toEqual([
      ["openai", 10],
      ["anthropic", 50],
    ]);
    // The margin is the pooled rate's own: 12 answers, each its own question cluster, so 1.96 x 100 x sqrt(1 / 54).
    // The old average gave about 36 here, because Claude's 2 answers counted as much as ChatGPT's 10.
    const [chatgpt, claude] = result.byModel.map((m) => m.estimate.margin);
    expect(result.overall!.margin).toBeCloseTo(26.7, 1);
    expect(result.overall!.margin).toBeLessThan(Math.min(chatgpt, claude));
  });

  it("gives the same score and margin as the old average when every AI has the same number of answers", () => {
    const checks = [...series("openai", 2, 10), ...series("anthropic", 8, 10)];
    const result = visibilityScore(checks, { now: NOW, models: ["openai", "anthropic"] });
    const [a, b] = result.byModel.map((m) => m.estimate);
    expect(result.overall?.score).toBeCloseTo((a.score + b.score) / 2);
    expect(result.overall?.margin).toBeCloseTo(Math.hypot(a.margin, b.margin) / 2);
  });

  it("leaves out answers from AI tools that are not chosen", () => {
    const checks = [...series("openai", 1, 10), ...series("perplexity", 5, 5)];
    expect(visibilityScore(checks, { now: NOW, models: ["openai"] }).overall?.score).toBeCloseTo(10);
  });

  it("scores competitors by the same pooled rule", () => {
    const named = (n: boolean) => ({ competitorsMentioned: n ? ["Rival"] : [] });
    const checks = [
      ...Array.from({ length: 10 }, (_, i) => check("openai", `q${i}`, 1, i < 4, named(i < 1))),
      ...Array.from({ length: 2 }, (_, i) => check("anthropic", `q${i}`, 1, false, named(true))),
    ];
    const [rival] = competitorScores(checks, ["Rival"], { now: NOW, models: MODELS });
    // 3 of 12 answers, not the average of 10 and 100 (55).
    expect(rival.estimate.score).toBeCloseTo(25);
  });
});
