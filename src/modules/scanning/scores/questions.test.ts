import { describe, expect, it } from "vitest";
import { check, MODELS, NOW } from "../scoring.test-helpers";
import { questionAppearances } from "./questions";

describe("questionAppearances", () => {
  it("says appeared in X of the last Y checks per question", () => {
    const checks = [
      check("openai", "q1", 1, true),
      check("anthropic", "q1", 2, true),
      check("perplexity", "q1", 3, false),
      check("openai", "q1", 50, true),
      check("openai", "q1", 100, false),
      check("openai", "q2", 1, false),
      check("openai", "q2", 40 * 24, true),
    ];
    const byQuestion = questionAppearances(checks, {
      now: NOW,
      models: MODELS,
      last: 4,
    });
    expect(byQuestion).toEqual([
      { questionId: "q1", appeared: 3, checks: 4 },
      { questionId: "q2", appeared: 0, checks: 1 },
    ]);
  });
});
