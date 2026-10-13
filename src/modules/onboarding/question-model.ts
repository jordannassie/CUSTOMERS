import "server-only";
// Claude Haiku picks or writes the questions (MVP_SPEC 5.3) with structured outputs; OpenAI answers the same
// prompt and schema when Claude fails (D-84). Clients are passed in; only a dal.ts reads secrets.
import { runJob, type AiClients } from "@/modules/ai";
import {
  PICK_MAX_TOKENS,
  PICK_MODEL,
  PICK_SYSTEM,
  pickOutput,
  pickUserMessage,
  WRITE_SYSTEM,
  writeOutput,
  writeUserMessage,
  type NumberedTemplate,
  type PickBusiness,
  type WriteOutput,
} from "./prompts/pick-questions.v5";

export type PickTemplates = (input: { business: PickBusiness; templates: NumberedTemplate[] }) => Promise<number[]>;
export type WriteQuestions = (input: { business: PickBusiness }) => Promise<WriteOutput["questions"]>;
export type QuestionModel = { pick: PickTemplates; write: WriteQuestions };

const TIMEOUT_MS = 30_000;

export function pickRequest(input: Parameters<PickTemplates>[0]) {
  return {
    task: "pick_questions",
    model: PICK_MODEL,
    maxTokens: PICK_MAX_TOKENS,
    system: PICK_SYSTEM,
    user: pickUserMessage(input.business, input.templates),
    schema: pickOutput,
    timeoutMs: TIMEOUT_MS,
  };
}

export function writeRequest(input: Parameters<WriteQuestions>[0]) {
  return {
    task: "write_questions",
    model: PICK_MODEL,
    maxTokens: PICK_MAX_TOKENS,
    system: WRITE_SYSTEM,
    user: writeUserMessage(input.business),
    schema: writeOutput,
    timeoutMs: TIMEOUT_MS,
  };
}

export function createQuestionModel(ai: AiClients): QuestionModel {
  return {
    pick: async (input) => (await runJob(ai, pickRequest(input))).output.numbers,
    write: async (input) => (await runJob(ai, writeRequest(input))).output.questions,
  };
}
