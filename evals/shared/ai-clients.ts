// Which provider an AI eval scores (D-84). Each run measures one provider on its own, so the backup is never
// mixed into Claude's score:
//   EVAL_AI_PROVIDER=anthropic (default): Claude only, the backup turned off.
//   EVAL_AI_PROVIDER=openai: the OpenAI backup model only, as if Claude were down.
import { createAiClients, type AiClients } from "@/modules/ai";

export type EvalProvider = "anthropic" | "openai";

export const EVAL_PROVIDER: EvalProvider = process.env.EVAL_AI_PROVIDER === "openai" ? "openai" : "anthropic";

const KEY_NAME: Record<EvalProvider, string> = { anthropic: "ANTHROPIC_API_KEY", openai: "OPENAI_API_KEY" };

/** The env var the chosen provider needs, or null when it is set. */
export function missingEvalKey(): string | null {
  return process.env[KEY_NAME[EVAL_PROVIDER]] ? null : KEY_NAME[EVAL_PROVIDER];
}

export function evalAiClients(): AiClients {
  return EVAL_PROVIDER === "openai"
    ? createAiClients({ anthropicKey: null, openaiKey: process.env.OPENAI_API_KEY })
    : createAiClients({ anthropicKey: process.env.ANTHROPIC_API_KEY, fallbackEnabled: false });
}
