import type { ServiceStatus } from "./schema";

export const PROBE_TIMEOUT_MS = 5_000;
export const WORKER_OVERDUE_MINUTES = 10;

type RequestSpec = { url: string; headers?: Record<string, string> };

export type Probe = {
  id: string;
  name: string;
  group: ServiceStatus["group"];
  /** The cheapest read-only call that proves the key works; none of these spend credits. */
  request: (key: string) => RequestSpec;
  /** A non-2xx answer that still proves the key is valid. */
  acceptsError?: (status: number, body: string) => boolean;
};

// Google's own documented example place; an ID-only Place Details call is a free SKU.
const SAMPLE_PLACE_ID = "ChIJj61dQgK6j4AR4GeTYWZsKWw";

export const PROBES: Probe[] = [
  {
    id: "openai",
    name: "OpenAI (ChatGPT)",
    group: "ai",
    request: (key) => ({ url: "https://api.openai.com/v1/models", headers: { authorization: `Bearer ${key}` } }),
  },
  {
    id: "anthropic",
    name: "Anthropic (Claude)",
    group: "ai",
    request: (key) => ({
      url: "https://api.anthropic.com/v1/models?limit=1",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01" },
    }),
  },
  {
    id: "perplexity",
    name: "Perplexity",
    group: "ai",
    // Perplexity has no models list; listing async requests is read-only and free.
    request: (key) => ({
      url: "https://api.perplexity.ai/async/chat/completions",
      headers: { authorization: `Bearer ${key}` },
    }),
  },
  {
    id: "google_places",
    name: "Google Places",
    group: "data",
    request: (key) => ({
      url: `https://places.googleapis.com/v1/places/${SAMPLE_PLACE_ID}`,
      headers: { "x-goog-api-key": key, "x-goog-fieldmask": "id" },
    }),
  },
  {
    id: "firecrawl",
    name: "Firecrawl",
    group: "data",
    request: (key) => ({
      url: "https://api.firecrawl.dev/v1/team/credit-usage",
      headers: { authorization: `Bearer ${key}` },
    }),
  },
  {
    id: "browserless",
    name: "Browserless",
    group: "data",
    request: (key) => ({ url: `https://production-sfo.browserless.io/pressure?token=${encodeURIComponent(key)}` }),
  },
  {
    id: "resend",
    name: "Resend (email)",
    group: "data",
    request: (key) => ({ url: "https://api.resend.com/domains", headers: { authorization: `Bearer ${key}` } }),
    // A sending-only key cannot list domains, but Resend only says so after accepting the key.
    acceptsError: (status, body) => status === 401 && body.includes("restricted_api_key"),
  },
  {
    id: "stripe",
    name: "Stripe",
    group: "payments",
    request: (key) => ({ url: "https://api.stripe.com/v1/balance", headers: { authorization: `Bearer ${key}` } }),
  },
];

export type ProbeDeps = { fetch?: typeof fetch; timeoutMs?: number };

type ProbeResult = Pick<ServiceStatus, "state" | "detail">;

export async function runProbe(probe: Probe, key: string | undefined, deps: ProbeDeps = {}): Promise<ProbeResult> {
  if (!key) return { state: "not_configured", detail: "No key is set." };

  const doFetch = deps.fetch ?? fetch;
  const { url, headers } = probe.request(key);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), deps.timeoutMs ?? PROBE_TIMEOUT_MS);

  try {
    const res = await doFetch(url, { method: "GET", headers, signal: controller.signal, cache: "no-store" });
    if (res.ok) return { state: "ok", detail: "Connected. The key works." };
    const body = await res.text().catch(() => "");
    return classifyFailure(probe, res.status, body);
  } catch {
    if (controller.signal.aborted) {
      return { state: "unknown", detail: "No answer in time. It may be slow or down." };
    }
    return { state: "unknown", detail: `Could not reach ${probe.name}.` };
  } finally {
    clearTimeout(timer);
  }
}

function classifyFailure(probe: Probe, status: number, body: string): ProbeResult {
  if (probe.acceptsError?.(status, body)) return { state: "ok", detail: "Connected. The key can send email only." };
  if (status === 401 || status === 403) return { state: "error", detail: `The key was rejected (${status}).` };
  if (status === 429) return { state: "unknown", detail: "Too many requests right now. Try again in a minute." };
  if (status >= 500) return { state: "error", detail: `${probe.name} is having problems (${status}).` };
  return { state: "error", detail: `Unexpected answer (${status}).` };
}

export function stripeMode(key: string | undefined): ServiceStatus["mode"] {
  if (!key) return undefined;
  if (/^(sk|rk)_live_/.test(key)) return "live";
  if (/^(sk|rk)_test_/.test(key)) return "sandbox";
  return undefined;
}

export type WorkerSnapshot = { lastFinishedAt: string | null; overdueJobs: number };

export function workerStatus(snapshot: WorkerSnapshot, now: Date): ProbeResult {
  if (snapshot.overdueJobs > 0) {
    const scans = snapshot.overdueJobs === 1 ? "1 scan is" : `${snapshot.overdueJobs} scans are`;
    return { state: "error", detail: `${scans} waiting more than ${WORKER_OVERDUE_MINUTES} minutes to start.` };
  }
  if (!snapshot.lastFinishedAt) return { state: "unknown", detail: "No scans have run yet." };
  return { state: "ok", detail: `Last scan finished ${timeAgo(new Date(snapshot.lastFinishedAt), now)}.` };
}

export function timeAgo(then: Date, now: Date): string {
  const minutes = Math.max(0, Math.round((now.getTime() - then.getTime()) / 60_000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours} h ago`;
  return `${Math.round(hours / 24)} days ago`;
}
