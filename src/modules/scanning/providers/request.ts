// Shared HTTP call for every provider (MVP_SPEC 5.2, REL-01): 30-second timeout per attempt,
// 2 retries with backoff on 429, 5xx and network errors, typed errors.
import type { ProviderId } from "./types";

export const TIMEOUT_MS = 30_000;
export const MAX_RETRIES = 2;
const BASE_DELAY_MS = 1_000;
const MAX_DELAY_MS = 10_000;

export type ProviderErrorKind = "rate_limit" | "server" | "timeout" | "network" | "client" | "bad_response";

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

export async function postJson(
  provider: ProviderId,
  url: string,
  headers: Record<string, string>,
  body: unknown,
  deps: RequestDeps = {},
): Promise<unknown> {
  const doFetch = deps.fetch ?? fetch;
  const sleep = deps.sleep ?? defaultSleep;
  const timeoutMs = deps.timeoutMs ?? TIMEOUT_MS;

  for (let attempt = 1; ; attempt++) {
    let failure: ProviderError;
    let retryAfterMs: number | null = null;
    try {
      const res = await doFetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (res.ok) return await readJson(res, provider, attempt);

      const detail = (await res.text().catch(() => "")).slice(0, 300);
      const kind = res.status === 429 ? "rate_limit" : res.status >= 500 ? "server" : "client";
      failure = new ProviderError({
        provider,
        kind,
        status: res.status,
        attempts: attempt,
        message: `${provider} returned ${res.status}: ${detail}`,
      });
      retryAfterMs = parseRetryAfter(res.headers.get("retry-after"));
    } catch (err) {
      if (err instanceof ProviderError) throw err;
      const timedOut = err instanceof DOMException && err.name === "TimeoutError";
      failure = new ProviderError({
        provider,
        kind: timedOut ? "timeout" : "network",
        attempts: attempt,
        cause: err,
        message: timedOut ? `${provider} did not answer within ${timeoutMs} ms` : `${provider} request failed`,
      });
      // A timed-out attempt already used the full 30 seconds; retrying here would stall the scan,
      // so it goes back to the job layer as retryable instead.
      if (timedOut) throw failure;
    }

    if (failure.kind === "client" || attempt > MAX_RETRIES) throw failure;
    await sleep(retryAfterMs ?? backoffMs(attempt));
  }
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
