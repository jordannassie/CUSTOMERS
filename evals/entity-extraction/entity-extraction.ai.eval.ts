// Runs the real extractor (Claude Haiku, a paid call per answer) on the labelled answers, so it
// lives in the AI suite (eval-ai.yml), which runs when a prompt, model or eval changes.
import { mkdirSync, writeFileSync } from "node:fs";
import { expect, it } from "vitest";
import { createHarness, describeEval } from "vitest-evals";
import { createNameExtractor } from "@/modules/scanning/extract";
import { EXTRACT_MODEL, EXTRACT_NAMES_VERSION } from "@/modules/scanning/prompts/extract-names.v1";
import { ProviderError } from "@/modules/scanning/providers/request";
import { apiErrorCase, gradeCase, loadDataset, score, type ExtractionCase, type GradedCase } from "./grader";

const PASS_F1 = 0.85; // MVP_SPEC 25, starting level
const dataset = loadDataset();
const apiKey = process.env.ANTHROPIC_API_KEY;
const ready = dataset !== null && Boolean(apiKey);

type Output = { names: string[] | null; costUsd: number; apiError: string | null };

const extractor = createHarness<ExtractionCase, Output>({
  name: "entity-extraction",
  run: async ({ input }) => {
    const extract = createNameExtractor(apiKey ?? "");
    let output: Output;
    try {
      const result = await extract(input.answer);
      output = { names: result.names.map((n) => n.name), costUsd: result.costUsd, apiError: null };
    } catch (err) {
      // Principle 9: only bad_response is the model's fault; anything else is an API error.
      if (err instanceof ProviderError && err.kind !== "bad_response") {
        output = { names: null, costUsd: 0, apiError: err.message };
      } else {
        output = { names: [], costUsd: 0, apiError: null };
      }
    }
    return { events: [{ type: "message", role: "assistant", content: JSON.stringify(output) }], output };
  },
});

// Skipped until a person has labelled dataset.v1.jsonl (see README.md), and without an API key.
describeEval(`entity extraction ${EXTRACT_NAMES_VERSION}`, { harness: extractor, skipIf: () => !ready }, (it) => {
  it(`reaches mean set F1 of at least ${PASS_F1}`, async ({ run }) => {
    const cases = dataset ?? [];
    const graded: GradedCase[] = [];
    let costUsd = 0;
    for (const input of cases) {
      const { output } = await run(input);
      costUsd += output.costUsd;
      graded.push(output.names === null ? apiErrorCase(input, output.apiError ?? "") : gradeCase(input, output.names));
    }
    const result = { ...score(graded), model: EXTRACT_MODEL, prompt: EXTRACT_NAMES_VERSION, costUsd };

    // Every case saved in full (principle 10).
    const dir = new URL("../results/", import.meta.url);
    mkdirSync(dir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    writeFileSync(new URL(`entity-extraction.${stamp}.json`, dir), JSON.stringify({ result, graded }, null, 2));

    console.log("entity extraction", result);
    for (const g of graded.filter((c) => c.missed.length || c.extra.length)) {
      console.log(`${g.id}: missed ${JSON.stringify(g.missed)}, extra ${JSON.stringify(g.extra)}`);
    }
    expect(result.scored).toBeGreaterThan(0);
    expect(result.meanF1).toBeGreaterThanOrEqual(PASS_F1);
  });
});

it.skipIf(ready)(
  dataset === null
    ? "skipped: evals/entity-extraction/dataset.v1.jsonl is not labelled yet (see README.md)"
    : "skipped: ANTHROPIC_API_KEY is not set",
  () => {},
);
