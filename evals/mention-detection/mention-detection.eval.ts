import { mkdirSync, writeFileSync } from "node:fs";
import { expect } from "vitest";
import { createHarness, describeEval } from "vitest-evals";
import { detectMention } from "@/modules/scanning/mentions";
import { loadDataset, score, type GradedCase, type MentionCase } from "./grader";

const PASS_ACCURACY = 0.95; // D-66
const dataset = loadDataset();

const detector = createHarness<MentionCase, { mentioned: boolean; position: number | null }>({
  name: "mention-detection",
  run: async ({ input }) => {
    const result = detectMention(input.answer, input.business);
    return {
      events: [{ type: "message", role: "assistant", content: input.answer }],
      output: { mentioned: result.mentioned, position: result.position },
    };
  },
});

// Skipped until people have labelled dataset.v1.jsonl (flag F-04); see README.md.
describeEval("mention detection v1", { harness: detector, skipIf: () => dataset === null }, (it) => {
  it(`is at least ${PASS_ACCURACY * 100}% accurate on labelled answers`, async ({ run }) => {
    const cases = dataset ?? [];
    expect(cases.filter((c) => c.mentioned).length).toBeGreaterThan(0);
    expect(cases.filter((c) => !c.mentioned).length).toBeGreaterThan(0);

    const graded: GradedCase[] = [];
    for (const input of cases) {
      const { output } = await run(input);
      graded.push({ ...input, predicted: output.mentioned, predictedPosition: output.position });
    }
    const result = score(graded);

    // Every case saved in full (MVP_SPEC 25, principle 10).
    const dir = new URL("../results/", import.meta.url);
    mkdirSync(dir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    writeFileSync(new URL(`mention-detection.${stamp}.json`, dir), JSON.stringify({ result, graded }, null, 2));

    console.log("mention detection", result);
    for (const c of graded.filter((g) => g.mentioned !== g.predicted)) {
      console.log(`${c.predicted ? "false positive" : "missed"}: ${c.id} (${c.business.name})`);
    }
    expect(result.accuracy).toBeGreaterThanOrEqual(PASS_ACCURACY);
  });
});
