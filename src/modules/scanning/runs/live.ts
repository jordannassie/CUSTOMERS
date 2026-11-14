import "server-only";
import { env } from "@/lib/env";
import { liveAiClients } from "@/modules/ai/server";
import { createNameExtractor, type ExtractNames } from "../extract";
import { createAnthropicCheck } from "../providers/anthropic";
import { createOpenAICheck } from "../providers/openai";
import { createPerplexityCheck } from "../providers/perplexity";
import { PROVIDER_TIMEOUT_MS } from "../providers/request";
import type { ProviderId, RunCheck } from "../providers/types";

// The live AI adapters and their API keys (split from dal.ts, which holds the database access for scan runs).

const PROVIDER_KEYS: Record<ProviderId, () => string | undefined> = {
  openai: () => env.OPENAI_API_KEY,
  anthropic: () => env.ANTHROPIC_API_KEY,
  perplexity: () => env.PERPLEXITY_API_KEY,
};

const ADAPTERS: Record<ProviderId, (apiKey: string) => RunCheck> = {
  openai: (key) => createOpenAICheck(key, { timeoutMs: PROVIDER_TIMEOUT_MS.openai }),
  anthropic: (key) => createAnthropicCheck(key, { timeoutMs: PROVIDER_TIMEOUT_MS.anthropic }),
  perplexity: (key) => createPerplexityCheck(key, { timeoutMs: PROVIDER_TIMEOUT_MS.perplexity }),
};

/** The live adapter for a provider, or null when its API key is not set. */
export function liveCheckRunner(provider: ProviderId): RunCheck | null {
  const key = PROVIDER_KEYS[provider]();
  return key ? ADAPTERS[provider](key) : null;
}

/** Claude Haiku, with OpenAI as the backup (D-84); null only when neither key is set. Usage is recorded per check. */
export function liveNameExtractor(): ExtractNames | null {
  const ai = liveAiClients();
  return ai.anthropic || ai.openai ? createNameExtractor(ai) : null;
}
