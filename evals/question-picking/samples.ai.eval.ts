// Paid, and only with SAMPLES=1: prints the questions three businesses get (a coffee shop in Austin, TX, a toy store
// in Brentwood, TN, a dentist in Los Angeles, CA) with prompt v7 and v8 side by side, through the real flow
// (Claude Haiku picks or writes, the question-fit.v1 check for the toy store), and the drafts the code dropped.
//   SAMPLES=1 node --env-file=.env.local node_modules/vitest/vitest.mjs run --project evals-ai evals/question-picking/samples.ai.eval.ts
// About 12 to 20 Haiku calls in all, under $0.25 (README.md). EVAL_AI_PROVIDER=openai runs the OpenAI backup instead.
import { mkdirSync, writeFileSync } from "node:fs";
import { expect, it } from "vitest";
import * as v7 from "@/modules/onboarding/prompts/pick-questions.v7";
import * as v8 from "@/modules/onboarding/prompts/pick-questions.v8";
import { createQuestionModel } from "@/modules/onboarding/question-model";
import { evalAiClients, EVAL_PROVIDER, missingEvalKey } from "../shared/ai-clients";
import { formatSamples, runSamples } from "./samples";

const missingKey = missingEvalKey();
const ready = process.env.SAMPLES === "1" && missingKey === null;

it.runIf(ready)("prints v7 and v8 questions side by side", { timeout: 600_000 }, async () => {
  const rows = await runSamples([
    { version: v7.PICK_PROMPT_VERSION, model: () => createQuestionModel(evalAiClients(), v7) },
    { version: v8.PICK_PROMPT_VERSION, model: () => createQuestionModel(evalAiClients(), v8) },
  ]);
  const text = `# Question samples (${EVAL_PROVIDER})\n\n${formatSamples(rows)}`;
  const dir = new URL("../results/", import.meta.url);
  mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  writeFileSync(new URL(`question-samples.${EVAL_PROVIDER}.${stamp}.md`, dir), text);
  writeFileSync(new URL(`question-samples.${EVAL_PROVIDER}.${stamp}.json`, dir), JSON.stringify(rows, null, 2));
  // Written straight to stdout: vitest hides console output from a passing test.
  process.stdout.write(`${text}\n`);
  expect(rows.every((r) => r.columns.every((c) => c.set !== null))).toBe(true);
});

it.skipIf(ready)(process.env.SAMPLES !== "1" ? "skipped: set SAMPLES=1 to run the paid samples" : `skipped: ${missingKey} is not set`, () => {});
