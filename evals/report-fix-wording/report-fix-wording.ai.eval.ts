// Paid: Claude Sonnet 5 (or the OpenAI backup with EVAL_AI_PROVIDER=openai) rewrites each case's fixes with the real
// prompt, the code grader checks them, then a judge from the other model family answers pass or fail (principle 5):
// GPT-4.1 grades Claude's wording, Claude Haiku grades the backup's. Step 1 checks the judge against the people's
// labels; its pass rate is only trusted once they agree on at least 90% of verdicts (principle 4). Skipped until a
// person has labelled dataset.v1.jsonl (see README.md).
import { mkdirSync, writeFileSync } from "node:fs";
import { expect, it } from "vitest";
import { createHarness, describeEval } from "vitest-evals";
import { AiUnavailableError, runJob } from "@/modules/ai";
import { FIX_WORDING_MODEL, FIX_WORDING_PROMPT_VERSION } from "@/modules/reports/prompts/fix-wording.v1";
import { buildFixWordingInput } from "@/modules/reports/v2/wording/input";
import { fixWordingRequest } from "@/modules/reports/v2/wording/writer";
import { evalAiClients, EVAL_PROVIDER, missingEvalKey } from "../shared/ai-clients";
import { createJudge, createOpenAiJudge, JUDGE_MODEL, JudgeApiError, modelFamily, OPENAI_JUDGE_MODEL, type Judge } from "../shared/judge";
import { agreement, allPass, codeGrade, JUDGE_PROMPT_VERSION, judgeWording, loadDataset, score, type GradedCase, type WordingCase } from "./grader";

const dataset = loadDataset();
const writerModel = EVAL_PROVIDER === "openai" ? "gpt-4.1" : FIX_WORDING_MODEL;
const judgeModel = EVAL_PROVIDER === "openai" ? JUDGE_MODEL : OPENAI_JUDGE_MODEL;
const judgeKeyName = EVAL_PROVIDER === "openai" ? "ANTHROPIC_API_KEY" : "OPENAI_API_KEY";
const missingKey = missingEvalKey() ?? (process.env[judgeKeyName] ? null : judgeKeyName);
const ready = dataset !== null && dataset.length > 0 && missingKey === null;

function judge(): Judge {
  if (modelFamily(writerModel) === modelFamily(judgeModel)) throw new Error(`${judgeModel} cannot grade ${writerModel}: same model family`);
  const key = process.env[judgeKeyName] ?? "";
  return EVAL_PROVIDER === "openai" ? createJudge(key) : createOpenAiJudge(key);
}

// The writer is called directly, not through wordFixes, so its raw answer is graded and a provider error is seen.
const apiError = (err: unknown) =>
  (err instanceof AiUnavailableError && !err.modelFault) || err instanceof JudgeApiError ? String(err.message) : null;

const harness = createHarness<WordingCase, GradedCase>({
  name: "report-fix-wording",
  run: async ({ input: c }) => {
    let output: GradedCase;
    try {
      const written = await runJob(evalAiClients(), fixWordingRequest(buildFixWordingInput(c.snapshot.fixes, c.snapshot)));
      const code = codeGrade(written.output, c.snapshot);
      const verdicts = await judgeWording(judge(), c.snapshot, written.output);
      output = { id: c.id, output: written.output, code, judge: verdicts, pass: code.pass && allPass(verdicts), apiError: null };
    } catch (err) {
      const api = apiError(err);
      // A model fault (refusal, bad JSON) is a failed case; a provider error is counted apart (principle 9).
      output = { id: c.id, output: null, code: null, judge: null, pass: false, apiError: api };
      if (api === null) output.code = { pass: false, issues: [`writer failed: ${String(err)}`] };
    }
    return { events: [{ type: "message", role: "assistant", content: JSON.stringify(output) }], output };
  },
});

describeEval(`report fix wording ${FIX_WORDING_PROMPT_VERSION}`, { harness, skipIf: () => !ready }, (it) => {
  it("judge agrees with people, then records the pass rate", async ({ run }) => {
    const pairs = [];
    for (const c of dataset ?? []) {
      pairs.push({ judge: await judgeWording(judge(), c.snapshot, c.calibration.output), human: c.calibration.human });
    }
    const calibration = agreement(pairs);

    const graded: GradedCase[] = [];
    for (const c of dataset ?? []) graded.push((await run(c)).output);
    const result = {
      ...score(graded),
      calibration,
      writer: writerModel,
      provider: EVAL_PROVIDER,
      judge: judgeModel,
      prompt: FIX_WORDING_PROMPT_VERSION,
      judgePrompt: JUDGE_PROMPT_VERSION,
    };

    // Every case saved in full (principle 10). Real cost is read from the provider dashboard for now.
    const dir = new URL("../results/", import.meta.url);
    mkdirSync(dir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    writeFileSync(new URL(`report-fix-wording.${EVAL_PROVIDER}.${stamp}.json`, dir), JSON.stringify({ result, pairs, graded }, null, 2));

    console.log("report fix wording", result);
    for (const g of graded.filter((c) => !c.pass)) console.log(`${g.id}: ${JSON.stringify({ code: g.code?.issues, judge: g.judge, apiError: g.apiError })}`);
    expect(calibration.trusted, `judge agrees with people on ${(calibration.overall * 100).toFixed(0)}%, needs 90%`).toBe(true);
    expect(result.scored).toBeGreaterThan(0);
    // Pass level is set after the first trusted baseline (MVP_SPEC 25); until then the rate is recorded.
  });
});

it.skipIf(ready)(
  dataset === null ? "skipped: evals/report-fix-wording/dataset.v1.jsonl is not labelled yet (see README.md)" : `skipped: ${missingKey} not set`,
  () => {},
);
