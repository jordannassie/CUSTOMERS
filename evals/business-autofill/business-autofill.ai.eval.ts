// Runs the real auto-fill (Firecrawl, Google Places, Claude Haiku and sometimes Sonnet, or with EVAL_AI_PROVIDER=openai
// the OpenAI backup models: paid calls per
// business) on the labelled businesses, so it lives in the AI suite (eval-ai.yml).
import { mkdirSync, writeFileSync } from "node:fs";
import { expect, it } from "vitest";
import { createHarness, describeEval } from "vitest-evals";
import { autofill } from "@/modules/onboarding/autofill";
import { AUTOFILL_MODEL, AUTOFILL_PROMPT_VERSION, AUTOFILL_RETRY_MODEL } from "@/modules/onboarding/prompts/business-autofill.v1";
import type { BusinessDetails } from "@/modules/onboarding/schema";
import { EVAL_PROVIDER } from "../shared/ai-clients";
import { missingAutofillKeys, recordingClients } from "./clients";
import { apiErrorCase, gradeCase, loadDataset, score, type AutofillCase, type GradedCase } from "./grader";

const dataset = loadDataset();
const missingKeys = missingAutofillKeys();
const ready = dataset !== null && missingKeys.length === 0;

type Output = { details: BusinessDetails | null; apiError: string | null };

const harness = createHarness<AutofillCase, Output>({
  name: "business-autofill",
  run: async ({ input }) => {
    const errors: string[] = [];
    const run = await autofill(input.input, recordingClients(errors));
    const output: Output = errors.length
      ? { details: null, apiError: errors.join("; ") }
      : { details: run.result.details, apiError: null };
    return { events: [{ type: "message", role: "assistant", content: JSON.stringify(output) }], output };
  },
});

// Skipped until a person has labelled dataset.v1.jsonl (see README.md), and without the three keys.
describeEval(`business auto-fill ${AUTOFILL_PROMPT_VERSION}`, { harness, skipIf: () => !ready }, (it) => {
  it("passes schema 100% with zero invented fields", async ({ run }) => {
    const graded: GradedCase[] = [];
    for (const c of dataset ?? []) {
      const { output } = await run(c);
      graded.push(output.details === null ? apiErrorCase(c, output.apiError ?? "") : gradeCase(c, output.details));
    }
    const result = { ...score(graded), provider: EVAL_PROVIDER, models: [AUTOFILL_MODEL, AUTOFILL_RETRY_MODEL], prompt: AUTOFILL_PROMPT_VERSION };

    // Every case saved in full (principle 10). Real cost is read from the provider dashboards for now.
    const dir = new URL("../results/", import.meta.url);
    mkdirSync(dir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    writeFileSync(new URL(`business-autofill.${EVAL_PROVIDER}.${stamp}.json`, dir), JSON.stringify({ result, graded }, null, 2));

    console.log("business auto-fill", result);
    for (const g of graded.filter((c) => c.invented.length || c.wrong.length || c.missed.length)) {
      console.log(`${g.id}: invented ${JSON.stringify(g.invented)}, wrong ${JSON.stringify(g.wrong)}, missed ${JSON.stringify(g.missed)}`);
    }
    expect(result.scored).toBeGreaterThan(0);
    expect(result.schemaRate).toBe(1);
    expect(result.inventedFields).toBe(0);
  });
});

it.skipIf(ready)(
  dataset === null
    ? "skipped: evals/business-autofill/dataset.v1.jsonl is not labelled yet (see README.md)"
    : `skipped: ${missingKeys.join(", ")} API key not set`,
  () => {},
);
