import type { CheckModel } from "./models";
import type { CheckUsage } from "./types";

type Price = {
  inputPerMTok: number;
  cachedInputPerMTok: number;
  outputPerMTok: number;
  searchCallUsd: number;
};

// Source: https://developers.openai.com/api/docs/pricing (standard tier), read 2026-09-27.
// gpt-4.1-mini: $0.40 input, $0.10 cached input, $1.60 output per 1M tokens.
// "Web search (all models)": $10.00 / 1k calls, search content tokens billed at model rates
// (they are already inside usage.input_tokens, so only the per-call fee is added here).
// Source: https://platform.claude.com/docs/en/about-claude/pricing, read 2026-09-27.
// claude-haiku-4-5: $1 input, $0.10 cache hits, $5 output per 1M tokens.
// Web search: $10 / 1k searches, results billed as input tokens; failed searches are not billed.
export const PRICES: Record<CheckModel, Price> = {
  "gpt-4.1-mini": { inputPerMTok: 0.4, cachedInputPerMTok: 0.1, outputPerMTok: 1.6, searchCallUsd: 0.01 },
  "claude-haiku-4-5": { inputPerMTok: 1, cachedInputPerMTok: 0.1, outputPerMTok: 5, searchCallUsd: 0.01 },
};

export function checkCostUsd(model: CheckModel, usage: CheckUsage): number {
  const price = PRICES[model];
  const cached = Math.min(usage.cachedInputTokens, usage.inputTokens);
  const cost =
    ((usage.inputTokens - cached) * price.inputPerMTok +
      cached * price.cachedInputPerMTok +
      usage.outputTokens * price.outputPerMTok) /
      1_000_000 +
    usage.searchCalls * price.searchCallUsd;
  // Micro-dollars keep float noise out of stored costs.
  return Math.round(cost * 1_000_000) / 1_000_000;
}
