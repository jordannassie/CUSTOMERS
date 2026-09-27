import "server-only";
// Claude Haiku picks or writes the questions (MVP_SPEC 5.3) with structured outputs. The API key is
// passed in; only a dal.ts reads secrets.
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
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
} from "./prompts/pick-questions.v1";

export type PickTemplates = (input: { business: PickBusiness; templates: NumberedTemplate[] }) => Promise<number[]>;
export type WriteQuestions = (input: { business: PickBusiness }) => Promise<WriteOutput["questions"]>;
export type QuestionModel = { pick: PickTemplates; write: WriteQuestions };

const TIMEOUT_MS = 30_000;

export function pickRequest(input: Parameters<PickTemplates>[0]) {
  return {
    model: PICK_MODEL,
    max_tokens: PICK_MAX_TOKENS,
    system: PICK_SYSTEM,
    messages: [{ role: "user" as const, content: pickUserMessage(input.business, input.templates) }],
    output_config: { format: zodOutputFormat(pickOutput) },
  };
}

export function writeRequest(input: Parameters<WriteQuestions>[0]) {
  return {
    model: PICK_MODEL,
    max_tokens: PICK_MAX_TOKENS,
    system: WRITE_SYSTEM,
    messages: [{ role: "user" as const, content: writeUserMessage(input.business) }],
    output_config: { format: zodOutputFormat(writeOutput) },
  };
}

export function createQuestionModel(apiKey: string, deps: { fetch?: typeof fetch } = {}): QuestionModel {
  const client = new Anthropic({ apiKey, fetch: deps.fetch, maxRetries: 1, timeout: TIMEOUT_MS });
  return {
    pick: async (input) => pickOutput.parse(messageJson(await client.messages.create(pickRequest(input)))).numbers,
    write: async (input) => writeOutput.parse(messageJson(await client.messages.create(writeRequest(input)))).questions,
  };
}

export function messageJson(message: Anthropic.Message): unknown {
  if (message.stop_reason === "refusal") throw new Error("Claude declined");
  if (message.stop_reason === "max_tokens") throw new Error("Claude ran out of output tokens");
  const text = message.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
  return JSON.parse(text);
}
