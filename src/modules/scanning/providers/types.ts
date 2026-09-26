// One AI check (MVP_SPEC 5.2). Every provider adapter (OpenAI, Claude, Perplexity) returns this shape.
import type { CheckModel } from "./models";

export type CheckLocation = {
  city: string;
  region: string;
  /** ISO 3166-1 alpha-2, e.g. "US". */
  country: string;
};

export type CheckInput = {
  question: string;
  location: CheckLocation;
  model: CheckModel;
};

export type Citation = {
  url: string;
  title: string | null;
};

export type CheckUsage = {
  inputTokens: number;
  /** Part of inputTokens billed at the cached rate. */
  cachedInputTokens: number;
  outputTokens: number;
  searchCalls: number;
};

export type CheckResult = {
  answerText: string;
  citations: Citation[];
  /** The model the provider reports it used, which can be a dated snapshot of the pinned ID. */
  model: string;
  usage: CheckUsage;
  costUsd: number;
  latencyMs: number;
};

export type RunCheck = (input: CheckInput) => Promise<CheckResult>;

export type ProviderId = "openai" | "anthropic" | "perplexity";
