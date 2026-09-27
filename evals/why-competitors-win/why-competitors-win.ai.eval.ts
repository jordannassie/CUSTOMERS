// Paid: Claude Sonnet 5 writes each case's explanation and Claude Haiku grades it, so this lives in the
// AI suite (eval-ai.yml). Step 1 checks the Haiku grader against the people's labels; its pass rate is
// only reported as trusted once they agree on at least 90% of verdicts (principle 4).
import { mkdirSync, writeFileSync } from "node:fs";
import { expect, it } from "vitest";
import { createHarness, describeEval } from "vitest-evals";
import { EXPLAIN_MODEL, EXPLAIN_PROMPT_VERSION } from "@/modules/insights/prompts/explain.v1";
import { createExplanationWriter, ExplainError } from "@/modules/insights/writer";
import { assertNotSelfGrading, createJudge, JUDGE_MODEL, JudgeApiError } from "../shared/judge";
import {
  agreement,
  allPass,
  codeGrade,
  JUDGE_PROMPT_VERSION,
  judgeExplanation,
  loadDataset,
  score,
  type ExplainCase,
  type GradedCase,
} from "./grader";

const dataset = loadDataset();
const apiKey = process.env.ANTHROPIC_API_KEY;
const ready = dataset !== null && Boolean(apiKey);

const apiError = (err: unknown) =>
  (err instanceof ExplainError && !err.modelFault) || err instanceof JudgeApiError ? String(err.cause ?? err.message) : null;

const harness = createHarness<ExplainCase, GradedCase>({
  name: "why-competitors-win",
  run: async ({ input: c }) => {
    const write = createExplanationWriter(apiKey ?? "");
    const judge = createJudge(apiKey ?? "");
    let output: GradedCase;
    try {
      const written = (await write(c.input)).output;
      const code = codeGrade(written, c.input);
      const verdicts = await judgeExplanation(judge, c.input, written);
      output = { id: c.id, output: written, code, judge: verdicts, pass: code.pass && allPass(verdicts), apiError: null };
    } catch (err) {
      const api = apiError(err);
      // A model fault (refusal, bad JSON) is a failed case; a provider error is counted apart.
      output = { id: c.id, output: null, code: null, judge: null, pass: false, apiError: api };
      if (api === null) output.code = { pass: false, issues: [`writer failed: ${String(err)}`] };
    }
    return { events: [{ type: "message", role: "assistant", content: JSON.stringify(output) }], output };
  },
});

// Skipped until a person has labelled dataset.v1.jsonl (see README.md), and without the API key.
describeEval(`why competitors win ${EXPLAIN_PROMPT_VERSION}`, { harness, skipIf: () => !ready }, (it) => {
  it("grader agrees with people, then records the pass rate", async ({ run }) => {
    assertNotSelfGrading(EXPLAIN_MODEL);
    const judge = createJudge(apiKey ?? "");
    const pairs = [];
    for (const c of dataset ?? []) {
      pairs.push({ judge: await judgeExplanation(judge, c.input, c.calibration.output), human: c.calibration.human });
    }
    const calibration = agreement(pairs);

    const graded: GradedCase[] = [];
    for (const c of dataset ?? []) graded.push((await run(c)).output);
    const result = {
      ...score(graded),
      calibration,
      writer: EXPLAIN_MODEL,
      judge: JUDGE_MODEL,
      prompt: EXPLAIN_PROMPT_VERSION,
      judgePrompt: JUDGE_PROMPT_VERSION,
    };

    // Every case saved in full (principle 10). Real cost is read from the provider dashboard for now.
    const dir = new URL("../results/", import.meta.url);
    mkdirSync(dir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    writeFileSync(new URL(`why-competitors-win.${stamp}.json`, dir), JSON.stringify({ result, pairs, graded }, null, 2));

    console.log("why competitors win", result);
    for (const g of graded.filter((c) => !c.pass)) console.log(`${g.id}: ${JSON.stringify({ code: g.code?.issues, judge: g.judge, apiError: g.apiError })}`);
    expect(calibration.trusted, `grader agrees with people on ${(calibration.overall * 100).toFixed(0)}%, needs 90%`).toBe(true);
    expect(result.scored).toBeGreaterThan(0);
    // Pass level is set after the first trusted baseline (MVP_SPEC 25); until then the rate is recorded.
  });
});

it.skipIf(ready)(
  dataset === null
    ? "skipped: evals/why-competitors-win/dataset.v1.jsonl is not labelled yet (see README.md)"
    : "skipped: ANTHROPIC_API_KEY not set",
  () => {},
);
