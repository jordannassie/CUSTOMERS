// The live fix wording writer: Claude Sonnet 5 with structured outputs, and the OpenAI backup (gpt-4.1) answering
// the same prompt and schema when Claude fails (D-84). Clients are passed in; only dal.ts builds the live ones.
// Cost is recorded by the clients' reporter (usage_events), like the other background jobs.
import { runJob, type AiClients } from "@/modules/ai";
import {
  FIX_WORDING_MAX_TOKENS,
  FIX_WORDING_MODEL,
  FIX_WORDING_SYSTEM,
  FIX_WORDING_TIMEOUT_MS,
  fixWordingOutput,
  fixWordingUserMessage,
  type FixWordingInput,
} from "@/modules/reports/prompts/fix-wording.v1";
import type { FixWordingWriter } from "./word-fixes";

export const FIX_WORDING_TASK = "report_fix_wording";

export function fixWordingRequest(input: FixWordingInput) {
  return {
    task: FIX_WORDING_TASK,
    model: FIX_WORDING_MODEL,
    maxTokens: FIX_WORDING_MAX_TOKENS,
    system: FIX_WORDING_SYSTEM,
    user: fixWordingUserMessage(input),
    schema: fixWordingOutput,
    timeoutMs: FIX_WORDING_TIMEOUT_MS,
  };
}

/** Null when neither Claude nor the backup is set up, so the template wording is kept without a call. */
export function createFixWordingWriter(ai: AiClients): FixWordingWriter | null {
  if (!ai.anthropic && !ai.openai) return null;
  return async (input) => {
    // AiUnavailableError (both providers failed, or the answer did not match the schema) is caught by wordFixes.
    const result = await runJob(ai, fixWordingRequest(input));
    return {
      output: result.output,
      model: result.model,
      usage: { inputTokens: result.usage.inputTokens, outputTokens: result.usage.outputTokens },
      provider: result.provider,
    };
  };
}
