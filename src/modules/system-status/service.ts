import type { ServiceStatus } from "./schema";

export const PROBE_TIMEOUT_MS = 5_000;
export const WORKER_OVERDUE_MINUTES = 10;

type RequestSpec = { url: string; headers?: Record<string, string> };

export type Probe = {
  id: string;
  name: string;
  group: ServiceStatus["group"];
  /** The cheapest read-only call that proves the key works; none of these spend credits. */
  request: (key: string, deps: ProbeDeps) => RequestSpec;
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
    // The Agent API's models list: free and read-only, and the same API scans use. The old async Sonar endpoint
    // was retired on 2026-09-27 and answers 403 even to a good key (BUG-081).
    request: (key) => ({ url: "https://api.perplexity.ai/v1/models", headers: { authorization: `Bearer ${key}` } }),
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
    // Prices Read is already on the app key (billing README); /v1/balance needed Balance Read just for this check.
    request: (key) => ({ url: "https://api.stripe.com/v1/prices?limit=1", headers: { authorization: `Bearer ${key}` } }),
  },
];

export type ProbeDeps = { fetch?: typeof fetch; timeoutMs?: number };

export type ProbeResult = Pick<ServiceStatus, "state" | "detail" | "fix">;

export async function runProbe(probe: Probe, key: string | undefined, deps: ProbeDeps = {}): Promise<ProbeResult> {
  if (!key) return { state: "not_configured", detail: "Not connected: no key is set on this site.", fix: `Add the ${probe.name} key in Netlify (Site configuration, Environment variables), then redeploy.` };

  const doFetch = deps.fetch ?? fetch;
  const { url, headers } = probe.request(key, deps);
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
  if (status === 401 || status === 403) {
    return { state: "error", detail: `${probe.name} turned down our key, so nothing that uses it works.`, fix: `Replace the ${probe.name} key in Netlify and redeploy (it answered ${status}).` };
  }
  if (status === 429) return { state: "unknown", detail: "Too many requests right now. Try again in a minute." };
  if (status >= 500) return { state: "error", detail: `${probe.name} is having problems on its side. It usually clears by itself.`, fix: `Check ${probe.name}'s status page if it lasts (it answered ${status}).` };
  return { state: "error", detail: `${probe.name} gave an unexpected answer.`, fix: `Tell the developer: the check answered ${status}.` };
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

/** "just now", "1 minute ago", "10 hours ago", "3 days ago": written out, never "10 h ago" (admin audit 2026-11-12). */
export function timeAgo(then: Date, now: Date): string {
  const minutes = Math.max(0, Math.round((now.getTime() - then.getTime()) / 60_000));
  const ago = (n: number, unit: string) => `${n} ${unit}${n === 1 ? "" : "s"} ago`;
  if (minutes < 1) return "just now";
  if (minutes < 60) return ago(minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (hours < 48) return ago(hours, "hour");
  return ago(Math.round(hours / 24), "day");
}

/**
 * How far back a credit error still counts. Checks for a provider can run only at a weekly scan, so a one-hour window
 * let Perplexity read "Working" for weeks while every scan's Perplexity checks failed (preview audit, 2026-11-12).
 * The error now holds until a real check from that provider succeeds after it.
 */
export const OUT_OF_CREDIT_LOOKBACK_DAYS = 14;

/**
 * The providers whose latest credit error came after their latest successful check. `lastError` and `lastSuccess`
 * map a provider to an ISO time; a provider with no success since its error is still out of credit. Pure.
 */
export function stillOutOfCredit(lastError: ReadonlyMap<string, string>, lastSuccess: ReadonlyMap<string, string>): Set<string> {
  const out = new Set<string>();
  for (const [provider, failedAt] of lastError) {
    const workedAt = lastSuccess.get(provider);
    if (!workedAt || Date.parse(workedAt) <= Date.parse(failedAt)) out.add(provider);
  }
  return out;
}

const OUT_OF_CREDIT_DETAIL: Record<string, string> = {
  anthropic:
    "Out of credit. Claude checks can't run and background jobs use the ChatGPT backup. Top up at console.anthropic.com (Plans & Billing).",
  openai: "Out of credit. ChatGPT checks and the backup for background jobs can't run. Top up at platform.openai.com (Billing).",
  perplexity: "Out of credit. Perplexity checks can't run. Add credits at perplexity.ai (API settings, Billing).",
};

/**
 * The key probes only list models, which still works with an empty account, so an account out of credit looks fine
 * there. Recent credit errors from real calls (provider_errors) override the probe for that provider (D-84).
 */
export function withCreditStatus(services: ServiceStatus[], outOfCredit: ReadonlySet<string>): ServiceStatus[] {
  return services.map((s) =>
    outOfCredit.has(s.id) && s.state !== "not_configured"
      ? { ...s, state: "error", detail: OUT_OF_CREDIT_DETAIL[s.id] ?? "Out of credit. Top up the account." }
      : s,
  );
}

/** How far back the System status counts emails that could not go out. */
export const EMAIL_FAILURE_WINDOW_HOURS = 24;

export type EmailFailures = { count: number; latest: string | null };

/**
 * Marks the Resend row as not working when emails failed in the last day, with how many and the newest reason (a
 * missing EMAIL_FROM, a rejected domain). The alerts job then opens an admin alert, as for any service down. A row
 * that is not set up keeps that state, with the count added. Pure.
 */
export function withEmailFailures(services: ServiceStatus[], failures: EmailFailures): ServiceStatus[] {
  if (failures.count === 0) return services;
  const what = `${failures.count} ${failures.count === 1 ? "email" : "emails"} could not be sent in the last ${EMAIL_FAILURE_WINDOW_HOURS} hours.`;
  const why = failures.latest ? ` Latest reason: ${failures.latest.slice(0, 160)}` : "";
  return services.map((s) =>
    s.id !== "resend"
      ? s
      : s.state === "not_configured"
        ? { ...s, detail: `${s.detail} ${what}` }
        : { ...s, state: "error", detail: `${what}${why}`, fix: "Check EMAIL_FROM and RESEND_API_KEY in Netlify, and the sending domain in Resend." },
  );
}
