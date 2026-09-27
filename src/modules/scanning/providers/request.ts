// Shared HTTP call for every provider (MVP_SPEC 5.2, REL-01): 30-second timeout per attempt,
// 2 retries with backoff on 429, 5xx and network errors, typed errors.
import type { ProviderId } from "./types";

export const TIMEOUT_MS = 30_000;
export const MAX_RETRIES = 2;
const BASE_DELAY_MS = 1_000;
const MAX_DELAY_MS = 10_000;

/** "search": the answer came back but every web search inside it failed (Claude reports this in a 200). */
export type ProviderErrorKind = "rate_limit" | "server" | "timeout" | "network" | "search" | "client" | "bad_response";

export class ProviderError extends Error {
  readonly provider: ProviderId;
  readonly kind: ProviderErrorKind;
  readonly status: number | null;
  /** True when trying the same check later may work; the job layer decides whether to requeue. */
  readonly retryable: boolean;
  readonly attempts: number;

  constructor(opts: {
    provider: ProviderId;
    kind: ProviderErrorKind;
    message: string;
    status?: number | null;
    attempts: number;
    cause?: unknown;
  }) {
    super(opts.message, { cause: opts.cause });
    this.name = "ProviderError";
    this.provider = opts.provider;
    this.kind = opts.kind;
    this.status = opts.status ?? null;
    this.retryable = opts.kind !== "client" && opts.kind !== "bad_response";
    this.attempts = opts.attempts;
  }
}

export type RequestDeps = {
  fetch?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  timeoutMs?: number;
};

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export type Attempt<T> = { ok: true; value: T } | { ok: false; error: ProviderError; retryAfterMs?: number | null };

/** Runs one provider call with the shared retry policy; adapters only classify each attempt. */
export async function withRetries<T>(
  run: (attempt: number) => Promise<Attempt<T>>,
  deps: Pick<RequestDeps, "sleep"> = {},
): Promise<T> {
  const sleep = deps.sleep ?? defaultSleep;
  for (let attempt = 1; ; attempt++) {
    const result = await run(attempt);
    if (result.ok) return result.value;
    const { error } = result;
    // A timed-out attempt already used the full 30 seconds; retrying here would stall the scan,
    // so it goes back to the job layer as retryable instead.
    const retryHere = error.kind === "rate_limit" || error.kind === "server" || error.kind === "network";
    if (!retryHere || attempt > MAX_RETRIES) throw error;
    await sleep(result.retryAfterMs ?? backoffMs(attempt));
  }
}

export function httpFailure(
  provider: ProviderId,
  status: number,
  detail: string,
  attempts: number,
  retryAfter: string | null,
): Attempt<never> {
  const kind = status === 429 ? "rate_limit" : status >= 500 ? "server" : "client";
  const message = `${provider} returned ${status}: ${detail.slice(0, 300)}`;
  return {
    ok: false,
    error: new ProviderError({ provider, kind, status, attempts, message }),
    retryAfterMs: parseRetryAfter(retryAfter),
  };
}

export function transportFailure(
  provider: ProviderId,
  err: unknown,
  attempts: number,
  timeoutMs: number,
  timedOut: boolean,
): Attempt<never> {
  const message = timedOut ? `${provider} did not answer within ${timeoutMs} ms` : `${provider} request failed`;
  const kind = timedOut ? "timeout" : "network";
  return { ok: false, error: new ProviderError({ provider, kind, attempts, cause: err, message }) };
}

export async function postJson(
  provider: ProviderId,
  url: string,
  headers: Record<string, string>,
  body: unknown,
  deps: RequestDeps = {},
): Promise<unknown> {
  const doFetch = deps.fetch ?? fetch;
  const timeoutMs = deps.timeoutMs ?? TIMEOUT_MS;

  return withRetries(async (attempt): Promise<Attempt<unknown>> => {
    try {
      const res = await doFetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (res.ok) return { ok: true, value: await readJson(res, provider, attempt) };
      const detail = await res.text().catch(() => "");
      return httpFailure(provider, res.status, detail, attempt, res.headers.get("retry-after"));
    } catch (err) {
      if (err instanceof ProviderError) throw err;
      const timedOut = err instanceof DOMException && err.name === "TimeoutError";
      return transportFailure(provider, err, attempt, timeoutMs, timedOut);
    }
  }, deps);
}

async function readJson(res: Response, provider: ProviderId, attempts: number): Promise<unknown> {
  try {
    return await res.json();
  } catch (err) {
    // The timeout can also fire while the body is still streaming.
    if (err instanceof DOMException && err.name === "TimeoutError") throw err;
    throw new ProviderError({ provider, kind: "bad_response", attempts, cause: err, message: `${provider} sent invalid JSON` });
  }
}

function backoffMs(attempt: number): number {
  const base = BASE_DELAY_MS * 2 ** (attempt - 1);
  return Math.min(MAX_DELAY_MS, base + Math.floor(Math.random() * 250));
}

function parseRetryAfter(value: string | null): number | null {
  if (!value) return null;
  const seconds = Number(value);
  if (!Number.isFinite(seconds) || seconds < 0) return null;
  return Math.min(MAX_DELAY_MS, seconds * 1_000);
}
