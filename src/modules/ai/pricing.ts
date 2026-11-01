// List prices in USD per million tokens for the background AI jobs, for our own cost records (usage_events).
// Source: https://platform.claude.com/docs/en/about-claude/pricing and https://developers.openai.com/api/docs/pricing,
// read 2026-10-12. Model ids come back dated ("gpt-4.1-mini-2025-04-14"), so prices match by prefix, longest first.
export type AiUsage = { inputTokens: number; cachedInputTokens: number; outputTokens: number };

type Price = { input: number; cachedInput: number; output: number };

const PRICES: [prefix: string, price: Price][] = [
  ["claude-haiku-4-5", { input: 1, cachedInput: 0.1, output: 5 }],
  ["claude-sonnet-5", { input: 2, cachedInput: 0.2, output: 10 }],
  ["gpt-4.1-mini", { input: 0.4, cachedInput: 0.1, output: 1.6 }],
  ["gpt-4.1", { input: 2, cachedInput: 0.5, output: 8 }],
];

export function priceOf(model: string): Price | null {
  return PRICES.find(([prefix]) => model.startsWith(prefix))?.[1] ?? null;
}

/** Cost of one call in USD, rounded to micro-dollars; 0 for a model with no listed price. */
export function aiCostUsd(model: string, usage: AiUsage): number {
  const price = priceOf(model);
  if (!price) return 0;
  const cached = Math.min(usage.cachedInputTokens, usage.inputTokens);
  const cost = ((usage.inputTokens - cached) * price.input + cached * price.cachedInput + usage.outputTokens * price.output) / 1_000_000;
  return Math.round(cost * 1_000_000) / 1_000_000;
}
