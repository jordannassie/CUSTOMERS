// The two SDK clients and the backup settings every background job shares. Keys are passed in; only dal.ts
// (or a script) reads them. Tests pass a fake fetch, so no real call is made.
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import type { z } from "zod";
import type { Breaker } from "./errors";
import { runStructured, sharedBreaker, type AiReporter, type RunStructuredInput, type RunStructuredResult } from "./structured";

export const DEFAULT_BACKUP_FAST = "gpt-4.1-mini";
export const DEFAULT_BACKUP_SMART = "gpt-4.1";

export type AiClients = {
  anthropic: Anthropic | null;
  /** Null when the backup is turned off or OPENAI_API_KEY is not set. */
  openai: OpenAI | null;
  /** Stands in for Haiku. */
  backupFast: string;
  /** Stands in for Sonnet. */
  backupSmart: string;
  breaker: Breaker;
  report?: AiReporter;
};

export type AiClientOptions = {
  anthropicKey?: string | null;
  openaiKey?: string | null;
  fallbackEnabled?: boolean;
  backupFast?: string;
  backupSmart?: string;
  /** Retries inside each SDK for 429, 5xx and network errors before the backup takes over. */
  maxRetries?: number;
  fetch?: typeof fetch;
  breaker?: Breaker;
  report?: AiReporter;
};

export function createAiClients(opts: AiClientOptions): AiClients {
  const maxRetries = opts.maxRetries ?? 1;
  const fetch = opts.fetch;
  return {
    anthropic: opts.anthropicKey ? new Anthropic({ apiKey: opts.anthropicKey, maxRetries, fetch }) : null,
    openai: opts.openaiKey && opts.fallbackEnabled !== false ? new OpenAI({ apiKey: opts.openaiKey, maxRetries, fetch }) : null,
    backupFast: opts.backupFast ?? DEFAULT_BACKUP_FAST,
    backupSmart: opts.backupSmart ?? DEFAULT_BACKUP_SMART,
    breaker: opts.breaker ?? sharedBreaker,
    report: opts.report,
  };
}

/** The OpenAI model that stands in for a Claude model: the smart one for Sonnet or Opus, the fast one otherwise. */
export function backupModelFor(claudeModel: string, ai: Pick<AiClients, "backupFast" | "backupSmart">): string {
  return /sonnet|opus/.test(claudeModel) ? ai.backupSmart : ai.backupFast;
}

export type JobInput<S extends z.ZodType> = Omit<RunStructuredInput<S>, "primary" | "backup" | "breaker" | "report"> & {
  /** The pinned Claude model from the job's prompt file. */
  model: string;
};

/** Runs one job on Claude with the OpenAI backup these clients carry. */
export function runJob<S extends z.ZodType>(ai: AiClients, job: JobInput<S>): Promise<RunStructuredResult<S>> {
  const { model, ...rest } = job;
  return runStructured({
    ...rest,
    primary: { anthropic: ai.anthropic, model },
    backup: ai.openai ? { openai: ai.openai, model: backupModelFor(model, ai) } : null,
    breaker: ai.breaker,
    report: ai.report,
  });
}
