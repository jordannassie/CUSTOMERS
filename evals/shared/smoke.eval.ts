import { describe, expect, it } from "vitest";
import { createHarness, describeEval } from "vitest-evals";
import recorded from "./fixtures/smoke-answers.json";
import { assertNotSelfGrading, JUDGE_MODEL } from "./judge";
import { accuracy, overlap, setF1 } from "./metrics";

type Answer = (typeof recorded.answers)[number];

// Replays recorded answers so the eval tooling is proven without any AI call or cost.
const replay = createHarness<Answer, { predicted: boolean }>({
  name: "recorded-answer",
  run: async ({ input }) => ({
    events: [
      { type: "message", role: "user", content: input.business },
      { type: "message", role: "assistant", content: input.text },
    ],
    output: { predicted: input.text.toLowerCase().includes(input.business.toLowerCase()) },
  }),
});

describeEval("eval tooling smoke", { harness: replay }, (it) => {
  it("grades recorded answers with a code grader", async ({ run }) => {
    const graded = [];
    for (const answer of recorded.answers) {
      const result = await run(answer);
      graded.push({ expected: answer.mentioned, predicted: result.output.predicted });
    }
    expect(accuracy(graded)).toEqual({ total: 2, accuracy: 1, falsePositives: 0, falseNegatives: 0 });
  });
});

describe("shared metrics", () => {
  it("scores set F1 without caring about case or order", () => {
    expect(setF1(["Rapid Rooter", "Ace Drains"], ["ace drains", "Rapid Rooter"])).toBe(1);
    expect(setF1(["Rapid Rooter", "Ace Drains"], ["Rapid Rooter", "Blue Pipes"])).toBe(0.5);
    expect(setF1(["Rapid Rooter"], [])).toBe(0);
  });

  it("scores overlap against the acceptable pool", () => {
    expect(overlap(["a", "b", "c", "d", "e"], ["a", "b", "c", "d"])).toBe(0.8);
  });

  it("refuses to let the judge grade its own output", () => {
    expect(() => assertNotSelfGrading(JUDGE_MODEL)).toThrow(/cannot grade its own output/);
    expect(() => assertNotSelfGrading("claude-sonnet-5")).not.toThrow();
  });
});
