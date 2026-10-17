// Paid: writes the 12 questions for each "Other" business in other-fit.v1.jsonl with the real flow (Claude Haiku
// writes, then the question-fit.v1 check; or the OpenAI backup with EVAL_AI_PROVIDER=openai) and grades every
// question. Code checks first, then a judge from the other model family answers pass or fail (principle 5): GPT-4.1
// grades Claude's questions, Claude Haiku grades the backup's. Reports percent relevant against a 90% target.
//   EVAL_ONLY=of-001-bookstore,of-005-gym   reruns some cases
//   EVAL_PACE_MS=2000                       waits between businesses
//   EVAL_NO_FIT=1                           runs without the fit check, as a baseline to compare with
import { mkdirSync, writeFileSync } from "node:fs";
import { expect, it } from "vitest";
import { createHarness, describeEval } from "vitest-evals";
import { AiUnavailableError } from "@/modules/ai";
import { PICK_MODEL, PICK_PROMPT_VERSION } from "@/modules/onboarding/prompts/pick-questions.v8";
import { FIT_MODEL, FIT_PROMPT_VERSION } from "@/modules/onboarding/prompts/question-fit.v1";
import { createQuestionModel, type QuestionModel } from "@/modules/onboarding/question-model";
import { prepareQuestions } from "@/modules/onboarding/questions";
import { evalAiClients, EVAL_PROVIDER, missingEvalKey } from "../shared/ai-clients";
import { createJudge, createOpenAiJudge, JUDGE_MODEL, JudgeApiError, modelFamily, OPENAI_JUDGE_MODEL, type Judge } from "../shared/judge";
import { gradeQuestions, isDraft, loadOtherFit, OTHER_FIT_JUDGE_VERSION, questionBusiness, relevance, type OtherFitCase, type OtherFitGraded } from "./other-fit";

const only = process.env.EVAL_ONLY?.split(",").map((s) => s.trim()).filter(Boolean);
const paceMs = Number(process.env.EVAL_PACE_MS ?? 0);
const withFit = process.env.EVAL_NO_FIT !== "1";
const cases = loadOtherFit()?.filter((c) => !only?.length || only.includes(c.id)) ?? null;

// The writer's family decides the judge's, so a model never grades its own family's output.
const writerModel = EVAL_PROVIDER === "openai" ? "gpt-4.1-mini" : PICK_MODEL;
const judgeModel = EVAL_PROVIDER === "openai" ? JUDGE_MODEL : OPENAI_JUDGE_MODEL;
const judgeKeyName = EVAL_PROVIDER === "openai" ? "ANTHROPIC_API_KEY" : "OPENAI_API_KEY";
const missingKey = missingEvalKey() ?? (process.env[judgeKeyName] ? null : judgeKeyName);
const ready = cases !== null && cases.length > 0 && missingKey === null;

function judge(): Judge {
  if (modelFamily(writerModel) === modelFamily(judgeModel)) throw new Error(`${judgeModel} cannot grade ${writerModel}: same model family`);
  const key = process.env[judgeKeyName] ?? "";
  return EVAL_PROVIDER === "openai" ? createJudge(key) : createOpenAiJudge(key);
}

// prepareQuestions hides model failures behind the fallback and the fit check keeps questions when it fails; the
// eval records API errors so those cases count apart (principle 9). Bad answers from the model stay scored.
function recordingModel(errors: string[]): QuestionModel {
  const model = createQuestionModel(evalAiClients());
  const record = (err: unknown): never => {
    if (err instanceof AiUnavailableError && !err.modelFault) errors.push(`${EVAL_PROVIDER}: ${err.message}`);
    throw err;
  };
  return {
    pick: (input) => model.pick(input).catch(record),
    write: (input) => model.write(input).catch(record),
    ...(withFit && model.fit ? { fit: (input: Parameters<NonNullable<QuestionModel["fit"]>>[0]) => model.fit!(input).catch(record) } : {}),
  };
}

const harness = createHarness<OtherFitCase, OtherFitGraded>({
  name: "other-fit",
  run: async ({ input }) => {
    const errors: string[] = [];
    let output: OtherFitGraded = { id: input.id, label: input.input.label, questions: null, fit: null, source: null, apiError: null };
    const set = await prepareQuestions(questionBusiness(input), { loadLibrary: async () => [], model: recordingModel(errors) });
    if (errors.length) output = { ...output, apiError: errors.join("; ") };
    else {
      const fit = set.fit ? { rounds: set.fit.rounds, rejected: set.fit.rejected.length, replaced: set.fit.replaced } : null;
      try {
        output = { ...output, source: set.source, fit, questions: await gradeQuestions(judge(), input, set.questions.map((q) => q.text)) };
      } catch (err) {
        if (!(err instanceof JudgeApiError)) throw err;
        output = { ...output, source: set.source, fit, apiError: `judge: ${err.message}` };
      }
    }
    return { events: [{ type: "message", role: "assistant", content: JSON.stringify(output) }], output };
  },
});

describeEval(`other fit ${FIT_PROMPT_VERSION}`, { harness, skipIf: () => !ready }, (it) => {
  it("reports the share of relevant questions for Other businesses", async ({ run }) => {
    const graded: OtherFitGraded[] = [];
    for (const [i, c] of (cases ?? []).entries()) {
      if (i > 0 && paceMs > 0) await new Promise((r) => setTimeout(r, paceMs));
      graded.push((await run(c)).output);
    }
    const result = {
      ...relevance(graded),
      provider: EVAL_PROVIDER,
      writer: writerModel,
      fitCheck: withFit ? FIT_MODEL : "off",
      judge: judgeModel,
      prompts: [PICK_PROMPT_VERSION, FIT_PROMPT_VERSION, OTHER_FIT_JUDGE_VERSION],
      draftLabels: (cases ?? []).some(isDraft),
    };

    const dir = new URL("../results/", import.meta.url);
    mkdirSync(dir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    writeFileSync(new URL(`other-fit.${EVAL_PROVIDER}${withFit ? "" : ".no-fit"}.${stamp}.json`, dir), JSON.stringify({ result, graded }, null, 2));

    console.log("other fit", result);
    if (result.draftLabels) console.log("The labels are still an agent's draft: a person must check them before this result is trusted.");
    for (const g of graded) {
      if (g.apiError) console.log(`${g.id}: API error ${g.apiError}`);
      for (const q of g.questions?.filter((x) => !x.pass) ?? []) console.log(`${g.id} (${g.label}): ${q.reason}: ${q.text}`);
    }
    expect(result.scored).toBeGreaterThan(0);
    expect(result.share).toBeGreaterThanOrEqual(result.target);
  });
});

it.skipIf(ready)(cases === null ? "skipped: evals/question-picking/other-fit.v1.jsonl is missing" : `skipped: ${missingKey} is not set`, () => {});
