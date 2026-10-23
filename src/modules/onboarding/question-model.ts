import "server-only";
// Claude Haiku picks or writes the questions (MVP_SPEC 5.3) with structured outputs; OpenAI answers the same
// prompt and schema when Claude fails (D-84). Clients are passed in; only a dal.ts reads secrets.
import { runJob, type AiClients } from "@/modules/ai";
import * as current from "./prompts/pick-questions.v8";
import type { NumberedTemplate, PickBusiness, WriteOutput } from "./prompts/pick-questions.v8";
import { FIT_MAX_TOKENS, FIT_MODEL, FIT_SYSTEM, fitOutput, fitUserMessage, type FitBusiness, type FitOutput } from "./prompts/question-fit.v1";

export type PickTemplates = (input: { business: PickBusiness; templates: NumberedTemplate[] }) => Promise<number[]>;
export type WriteQuestions = (input: { business: PickBusiness }) => Promise<WriteOutput["questions"]>;
/** One verdict per question, in order: true when it fits the business (question-fit.v1). */
export type CheckFit = (input: { business: FitBusiness; questions: string[] }) => Promise<boolean[]>;
/** fit is left out where no check is wanted (fixtures, tests of the other steps): the questions stay as written. */
export type QuestionModel = { pick: PickTemplates; write: WriteQuestions; fit?: CheckFit };

const TIMEOUT_MS = 30_000;

/** A pick-questions prompt file: the current one, or an older version for a before and after sample (evals). */
export type PickPrompts = {
  PICK_MODEL: string;
  PICK_MAX_TOKENS: number;
  PICK_SYSTEM: string;
  WRITE_SYSTEM: string;
  pickOutput: typeof current.pickOutput;
  writeOutput: typeof current.writeOutput;
  pickUserMessage: typeof current.pickUserMessage;
  writeUserMessage: typeof current.writeUserMessage;
};

export function pickRequest(input: Parameters<PickTemplates>[0], prompts: PickPrompts = current) {
  return {
    task: "pick_questions",
    model: prompts.PICK_MODEL,
    maxTokens: prompts.PICK_MAX_TOKENS,
    system: prompts.PICK_SYSTEM,
    user: prompts.pickUserMessage(input.business, input.templates),
    schema: prompts.pickOutput,
    timeoutMs: TIMEOUT_MS,
  };
}

export function writeRequest(input: Parameters<WriteQuestions>[0], prompts: PickPrompts = current) {
  return {
    task: "write_questions",
    model: prompts.PICK_MODEL,
    maxTokens: prompts.PICK_MAX_TOKENS,
    system: prompts.WRITE_SYSTEM,
    user: prompts.writeUserMessage(input.business),
    schema: prompts.writeOutput,
    timeoutMs: TIMEOUT_MS,
  };
}

export function fitRequest(input: Parameters<CheckFit>[0]) {
  return {
    task: "question_fit",
    model: FIT_MODEL,
    maxTokens: FIT_MAX_TOKENS,
    system: FIT_SYSTEM,
    user: fitUserMessage(input.business, input.questions),
    schema: fitOutput,
    timeoutMs: TIMEOUT_MS,
  };
}

/** A question the answer skipped counts as fitting: a short answer never costs the business a good question. */
export function fitVerdicts(output: FitOutput, count: number): boolean[] {
  const no = new Set(output.answers.filter((a) => a.fits === "no").map((a) => a.number));
  return Array.from({ length: count }, (_, i) => !no.has(i + 1));
}

export function createQuestionModel(ai: AiClients, prompts: PickPrompts = current): QuestionModel {
  return {
    pick: async (input) => (await runJob(ai, pickRequest(input, prompts))).output.numbers,
    write: async (input) => (await runJob(ai, writeRequest(input, prompts))).output.questions,
    fit: async (input) => fitVerdicts((await runJob(ai, fitRequest(input))).output, input.questions.length),
  };
}
