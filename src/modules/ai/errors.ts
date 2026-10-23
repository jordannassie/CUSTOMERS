// Why a background AI call failed, and whether the backup should take over. Pure: no clients, no I/O.
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

export type AiProvider = "anthropic" | "openai";

/**
 * credit: the account has no credit (Anthropic 400 "credit balance", OpenAI 429 insufficient_quota).
 * auth: 401 or 403. rate_limit: 429. server: 5xx (and Anthropic's 529). timeout, network: no answer.
 * model_fault: an answer came back but could not be used (refused, cut off, JSON outside the schema).
 * bad_request: any other 4xx, so our own request is wrong; this is a bug and never falls back.
 * not_configured: no API key for this provider.
 */
export type AiFailureKind =
  | "credit"
  | "auth"
  | "rate_limit"
  | "server"
  | "timeout"
  | "network"
  | "model_fault"
  | "bad_request"
  | "not_configured";

export type AiFailure = { provider: AiProvider; model: string; kind: AiFailureKind; status: number | null; message: string };

/** The answer came back but cannot be used. */
export class ModelFault extends Error {
  readonly reason: "refused" | "cut_off" | "bad_json";
  constructor(reason: ModelFault["reason"], message: string, cause?: unknown) {
    super(message, { cause });
    this.name = "ModelFault";
    this.reason = reason;
  }
}

/** Both providers failed (or the only one tried did). Carries both reasons for logs and the screen. */
export class AiUnavailableError extends Error {
  readonly primary: AiFailure | null;
  readonly backup: AiFailure | null;
  constructor(primary: AiFailure | null, backup: AiFailure | null) {
    const parts = [primary, backup].filter((f): f is AiFailure => f !== null).map(describeFailure);
    super(`AI unavailable: ${parts.join("; ") || "no provider is set up"}`);
    this.name = "AiUnavailableError";
    this.primary = primary;
    this.backup = backup;
  }

  /** True when every attempt was a model fault: the models answered, the answers were unusable. */
  get modelFault(): boolean {
    const tried = [this.primary, this.backup].filter((f): f is AiFailure => f !== null);
    return tried.length > 0 && tried.every((f) => f.kind === "model_fault");
  }
}

export function describeFailure(f: AiFailure): string {
  return `${f.provider} ${f.model} ${f.kind}${f.status ? ` ${f.status}` : ""}: ${f.message}`.slice(0, 400);
}

const CREDIT = /credit balance|insufficient_quota|exceeded your current quota|billing/i;

export function classifyAiError(provider: AiProvider, model: string, err: unknown): AiFailure {
  const base = { provider, model };
  if (err instanceof ModelFault) return { ...base, kind: "model_fault", status: null, message: err.message };
  if (err instanceof Anthropic.APIConnectionTimeoutError || err instanceof OpenAI.APIConnectionTimeoutError) {
    return { ...base, kind: "timeout", status: null, message: "no answer in time" };
  }
  if (err instanceof Anthropic.APIConnectionError || err instanceof OpenAI.APIConnectionError) {
    return { ...base, kind: "network", status: null, message: "could not connect" };
  }
  if ((err instanceof Anthropic.APIError || err instanceof OpenAI.APIError) && typeof err.status === "number") {
    const status = err.status;
    const message = err.message.slice(0, 300);
    if (CREDIT.test(message) && (status === 400 || status === 402 || status === 429)) return { ...base, kind: "credit", status, message };
    if (status === 401 || status === 403) return { ...base, kind: "auth", status, message };
    if (status === 429) return { ...base, kind: "rate_limit", status, message };
    if (status >= 500) return { ...base, kind: "server", status, message };
    return { ...base, kind: "bad_request", status, message };
  }
  const message = err instanceof Error ? err.message : String(err);
  return { ...base, kind: "network", status: null, message: message.slice(0, 300) };
}

/** Our own bad request is a bug to fix, not an outage; everything else is worth trying the backup for. */
export function shouldFallBack(kind: AiFailureKind): boolean {
  return kind !== "bad_request";
}

const MINUTE = 60_000;

/**
 * How long Claude stays out after its last rejected key or credit error, for scans and background jobs alike. The
 * outage is the open "claude_unavailable" admin alert, so every server instance sees it (BUG-253).
 */
export const CLAUDE_OUTAGE_MINUTES = 30;

/** The admin alert text: what is wrong, what runs meanwhile, and what fixes it. */
export function claudeOutageMessage(reason: "auth" | "credit"): string {
  const cause =
    reason === "auth"
      ? "Anthropic rejected the API key. Set a working ANTHROPIC_API_KEY."
      : "The Anthropic account is out of credit. Top it up at console.anthropic.com (Plans & Billing).";
  return `Claude unavailable: ${cause} Scans run on ChatGPT and Perplexity, and background jobs use the ChatGPT backup, until Claude works again.`;
}

/** How long to skip the primary after this failure, or 0 to keep trying it. */
export function breakerMs(kind: AiFailureKind): number {
  if (kind === "credit" || kind === "auth") return 15 * MINUTE;
  if (kind === "rate_limit" || kind === "server") return 2 * MINUTE;
  return 0;
}

/** In memory, per server instance: after a credit or auth failure the next calls go straight to the backup. */
export type Breaker = {
  isOpen(provider: AiProvider, now: number): { open: true; reason: AiFailure } | { open: false };
  trip(failure: AiFailure, now: number): void;
  reset(): void;
};

export function createBreaker(): Breaker {
  const until = new Map<AiProvider, { at: number; reason: AiFailure }>();
  return {
    isOpen(provider, now) {
      const state = until.get(provider);
      if (!state || state.at <= now) return { open: false };
      return { open: true, reason: state.reason };
    },
    trip(failure, now) {
      const ms = breakerMs(failure.kind);
      if (ms > 0) until.set(failure.provider, { at: now + ms, reason: failure });
    },
    reset() {
      until.clear();
    },
  };
}
