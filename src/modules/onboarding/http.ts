// One HTTP call per source with a hard timeout, for Google Places and Firecrawl. A busy (429) or failing (5xx) answer
// is tried once more after a short pause: a passing limit often clears (2026-10-14). A used-up daily quota does not,
// and the caller then says the source is unavailable rather than that nothing was found. Timeouts and network errors
// are not retried: auto-fill is interactive, so the caller falls back to whatever the other source found.
// Each answered Places or Firecrawl call is recorded with what it cost, for the admin Usage and cost page (2026-11-17).
export type HttpDeps = { fetch?: typeof fetch; timeoutMs?: number; retryDelayMs?: number };

/**
 * fetch that records each call's cost. Loaded on first use, not at import: the evals and scripts use this file without
 * the app's settings, which the recorder needs (env.ts). Without them it is plain fetch, and nothing is recorded.
 */
async function costedFetch(): Promise<typeof fetch> {
  try {
    return (await import("@/modules/service-costs")).meteredFetch();
  } catch {
    return fetch;
  }
}

const RETRY_DELAY_MS = 800;
const busy = (status: number) => status === 429 || status >= 500;

async function onceMore(call: () => Promise<JsonResponse>, deps: HttpDeps): Promise<JsonResponse> {
  const first = await call();
  if (!busy(first.status)) return first;
  await new Promise((resolve) => setTimeout(resolve, deps.retryDelayMs ?? RETRY_DELAY_MS));
  return call();
}

export const SOURCE_TIMEOUT_MS = 25_000;

export type JsonResponse = { status: number; body: unknown };

export async function postJson(
  url: string,
  headers: Record<string, string>,
  body: unknown,
  deps: HttpDeps = {},
): Promise<JsonResponse> {
  const doFetch = deps.fetch ?? (await costedFetch());
  return onceMore(async () => {
    const res = await doFetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(deps.timeoutMs ?? SOURCE_TIMEOUT_MS),
    });
    return { status: res.status, body: parseBody(await res.text()) };
  }, deps);
}

function parseBody(text: string): unknown {
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
}

export async function getJson(url: string, headers: Record<string, string>, deps: HttpDeps = {}): Promise<JsonResponse> {
  const doFetch = deps.fetch ?? (await costedFetch());
  return onceMore(async () => {
    const res = await doFetch(url, { headers, signal: AbortSignal.timeout(deps.timeoutMs ?? SOURCE_TIMEOUT_MS) });
    return { status: res.status, body: parseBody(await res.text()) };
  }, deps);
}
