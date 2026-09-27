// One HTTP call per source with a hard timeout. Auto-fill is interactive, so failures are not
// retried here; the caller falls back to whatever the other source found.
export type HttpDeps = { fetch?: typeof fetch; timeoutMs?: number };

export const SOURCE_TIMEOUT_MS = 25_000;

export type JsonResponse = { status: number; body: unknown };

export async function postJson(
  url: string,
  headers: Record<string, string>,
  body: unknown,
  deps: HttpDeps = {},
): Promise<JsonResponse> {
  const doFetch = deps.fetch ?? fetch;
  const res = await doFetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(deps.timeoutMs ?? SOURCE_TIMEOUT_MS),
  });
  return { status: res.status, body: parseBody(await res.text()) };
}

function parseBody(text: string): unknown {
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
}

export async function getJson(url: string, headers: Record<string, string>, deps: HttpDeps = {}): Promise<JsonResponse> {
  const doFetch = deps.fetch ?? fetch;
  const res = await doFetch(url, { headers, signal: AbortSignal.timeout(deps.timeoutMs ?? SOURCE_TIMEOUT_MS) });
  return { status: res.status, body: parseBody(await res.text()) };
}
