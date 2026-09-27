import "server-only";
// Claude Sonnet 5 writes the reasons with structured outputs (MVP_SPEC 7.2, D-30). The API key is
// passed in; only a dal.ts reads secrets. Tests pass a fake fetch, so no real call is made.
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { WriteExplanation } from "./explain";
import type { ExplainInput } from "./facts";
import {
  EXPLAIN_MAX_TOKENS,
  EXPLAIN_MODEL,
  EXPLAIN_SYSTEM,
  explainOutput,
  explainUserMessage,
  type ExplainOutput,
} from "./prompts/explain.v1";

const TIMEOUT_MS = 120_000;

export class ExplainError extends Error {
  /** True when the model itself failed (refusal, cut off, bad JSON), false for API or network errors. */
  readonly modelFault: boolean;
  constructor(message: string, modelFault: boolean, cause?: unknown) {
    super(message, { cause });
    this.name = "ExplainError";
    this.modelFault = modelFault;
  }
}

export function explainRequest(input: ExplainInput) {
  return {
    model: EXPLAIN_MODEL,
    max_tokens: EXPLAIN_MAX_TOKENS,
    system: EXPLAIN_SYSTEM,
    messages: [{ role: "user" as const, content: explainUserMessage(input) }],
    output_config: { format: zodOutputFormat(explainOutput) },
  };
}

export function createExplanationWriter(apiKey: string, deps: { fetch?: typeof fetch } = {}): WriteExplanation {
  const client = new Anthropic({ apiKey, fetch: deps.fetch, maxRetries: 1, timeout: TIMEOUT_MS });
  return async (input) => {
    let message: Anthropic.Message;
    try {
      message = await client.messages.create(explainRequest(input));
    } catch (err) {
      throw new ExplainError("Claude request failed", false, err);
    }
    return {
      output: toOutput(message),
      model: message.model,
      usage: { inputTokens: message.usage.input_tokens, outputTokens: message.usage.output_tokens },
    };
  };
}

export function toOutput(message: Anthropic.Message): ExplainOutput {
  if (message.stop_reason === "refusal") throw new ExplainError("Claude declined", true);
  if (message.stop_reason === "max_tokens") throw new ExplainError("Claude ran out of output tokens", true);
  const text = message.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
  try {
    return explainOutput.parse(JSON.parse(text));
  } catch (err) {
    throw new ExplainError("Claude returned JSON that does not match the schema", true, err);
  }
}
