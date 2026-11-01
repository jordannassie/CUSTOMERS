import "server-only";
// Claude Sonnet 5 writes the reasons with structured outputs (MVP_SPEC 7.2, D-30); OpenAI answers the same prompt
// and schema when Claude fails (D-84). Clients are passed in; only a dal.ts reads secrets. Tests pass a fake fetch,
// so no real call is made.
import { AiUnavailableError, runJob, type AiClients } from "@/modules/ai";
import type { WriteExplanation } from "./explain";
import type { ExplainInput } from "./facts";
import {
  EXPLAIN_MAX_TOKENS,
  EXPLAIN_MODEL,
  EXPLAIN_SYSTEM,
  explainOutput,
  explainUserMessage,
} from "./prompts/explain.v2";

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
    task: "why_competitors_win",
    model: EXPLAIN_MODEL,
    maxTokens: EXPLAIN_MAX_TOKENS,
    system: EXPLAIN_SYSTEM,
    user: explainUserMessage(input),
    schema: explainOutput,
    timeoutMs: TIMEOUT_MS,
  };
}

export function createExplanationWriter(ai: AiClients): WriteExplanation {
  return async (input) => {
    try {
      const result = await runJob(ai, explainRequest(input));
      return {
        output: result.output,
        model: result.model,
        usage: { inputTokens: result.usage.inputTokens, outputTokens: result.usage.outputTokens },
        writer: { provider: result.provider, fellBack: result.fellBack, primaryError: result.primaryError },
      };
    } catch (err) {
      if (err instanceof AiUnavailableError) throw new ExplainError(err.message, err.modelFault, err);
      throw new ExplainError("Explanation request failed", false, err);
    }
  };
}
