// Pure rules for the admin Scans page (B-67, MVP_SPEC 9.1).
import { MODEL_LABELS } from "../usage-cost/service";

/** Milliseconds from start to finish, or null while a job has not both started and finished. */
export function durationMs(startedAt: string | null, finishedAt: string | null): number | null {
  if (!startedAt || !finishedAt) return null;
  const ms = new Date(finishedAt).getTime() - new Date(startedAt).getTime();
  return ms >= 0 ? ms : null;
}

/** "45s", "3m 26s", "2h 5m", "2d 15h": the two largest units, so a stuck job never reads as "1501m 3s". */
export function formatDuration(ms: number | null): string {
  if (ms === null) return "";
  const seconds = Math.round(ms / 1000);
  if (seconds < 1) return "Under 1s";
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ${minutes % 60}m`;
  return `${Math.floor(hours / 24)}d ${hours % 24}h`;
}

// A scan takes minutes. A run open longer than this was tried again later (by the worker or an admin).
const SPREAD_OVER_MS = 60 * 60 * 1000;

export type ScanTiming = {
  /** How long the scan itself took: the last try when known, else the whole run. */
  durationMs: number | null;
  /** Set when the tries were spread out: from the first try to the end. "7d 22h" alone read as a slow scan. */
  retriedOverMs: number | null;
};

/**
 * A job's time (admin audit 2026-11-12). A retried job keeps its run, so the run spans every try and the wait
 * between them. A done job still has its last claim (locked_at), which times the try that finished it.
 */
export function scanTiming(t: { runStart: string | null; runEnd: string | null; lockedAt: string | null; finishedAt: string | null; hasRun: boolean }): ScanTiming {
  const lastTry = durationMs(t.lockedAt, t.finishedAt);
  if (!t.hasRun) return { durationMs: lastTry, retriedOverMs: null };
  const span = durationMs(t.runStart, t.runEnd);
  if (span === null || span < SPREAD_OVER_MS) return { durationMs: span, retriedOverMs: null };
  // A failed job loses its last claim time: only the spread is known.
  if (lastTry === null) return { durationMs: null, retriedOverMs: span };
  // Mostly waiting between tries: the last try's own time, and how long the tries took in all.
  if (lastTry * 2 < span) return { durationMs: lastTry, retriedOverMs: span };
  return { durationMs: span, retriedOverMs: null };
}

/** Models a job asked for: the run records them as "openai,anthropic"; before a run exists, the business's. */
export function jobModels(runProvider: string | null, businessModels: string[]): string[] {
  const fromRun = runProvider?.split(",").filter(Boolean) ?? [];
  return fromRun.length > 0 ? fromRun : businessModels;
}

/** Sums cost per key, treating a missing cost as zero. */
export function sumBy<T>(rows: T[], key: (row: T) => string, value: (row: T) => number | null): Map<string, number> {
  const totals = new Map<string, number>();
  for (const row of rows) totals.set(key(row), (totals.get(key(row)) ?? 0) + (value(row) ?? 0));
  return totals;
}

const listOf = (names: string[]) => (names.length < 2 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`);
const label = (provider: string) => MODEL_LABELS[provider as keyof typeof MODEL_LABELS] ?? provider;

type RunChecks = { checksTotal: number | null; checksFailed: number | null; failedByProvider: unknown; error: string | null };

/**
 * A short note for a scan that finished with some checks missing (admin audit 2026-11-12): "12 of 36 checks failed
 * (Perplexity)". Null when every check worked. Runs from before the counts were kept say "Some checks failed".
 */
export function partialNote(run: RunChecks): string | null {
  const byProvider = (run.failedByProvider && typeof run.failedByProvider === "object" ? run.failedByProvider : {}) as Record<
    string,
    { failed?: number; skipped?: number } | undefined
  >;
  const failedTools = Object.keys(byProvider).filter((p) => (byProvider[p]?.failed ?? 0) > 0);
  const leftOut = Object.values(byProvider).reduce((n, p) => n + (p?.skipped ?? 0), 0);
  const notes: string[] = [];
  const failed = run.checksFailed ?? 0;
  if (failed > 0 && run.checksTotal) {
    const tools = failedTools.length ? ` (${listOf(failedTools.map(label))})` : "";
    notes.push(`${failed} of ${run.checksTotal} checks failed${tools}.`);
  }
  if (leftOut > 0) notes.push(`${leftOut} Claude ${leftOut === 1 ? "check was" : "checks were"} left out while Claude was unavailable.`);
  if (notes.length === 0 && (failed > 0 || run.error)) notes.push("Some checks failed.");
  return notes.length ? notes.join(" ") : null;
}

export type NewerScan = "done" | "queued" | "running";

/**
 * A failed or skipped scan that another scan of the same business already replaced: a newer done scan, or a scan
 * waiting or running now (a retry would be refused for it, D-55). `newest` is the business's latest done, waiting or
 * running job; `active` its waiting or running one, if any.
 */
export function replacedBy(
  createdAt: string,
  newest: { status: string; createdAt: string } | undefined,
  active?: { status: string } | undefined,
): NewerScan | null {
  if (active?.status === "queued" || active?.status === "running") return active.status;
  if (!newest || Date.parse(newest.createdAt) <= Date.parse(createdAt)) return null;
  return newest.status === "done" || newest.status === "queued" || newest.status === "running" ? newest.status : null;
}

export const REPLACED_NOTE: Record<NewerScan, string> = {
  done: "A newer scan of this business finished, so this one needs no retry.",
  queued: "This business already has a scan waiting to run.",
  running: "This business has a scan running now.",
};

const BUSINESS_DELETED = "This business was deleted.";

/**
 * Whether a failed or skipped scan offers Retry, and if not, why (admin audit 2026-11-12). Retry would only repeat a
 * skip for billing, scan a business twice when a newer scan replaced it, or be refused for a deleted business.
 */
export function retryState(job: {
  status: string;
  error: string | null;
  businessDeleted: boolean;
  newer: NewerScan | null;
  /** Why retrying cannot help, from the skip reason (explainScanError's noRetry). */
  blocked: string | null;
}): { canRetry: boolean; retryNote: string | null } {
  if (job.status !== "failed" && job.status !== "skipped") return { canRetry: false, retryNote: null };
  // The skip reason already says the business was deleted; no need to say it twice.
  if (job.businessDeleted) return { canRetry: false, retryNote: job.error === BUSINESS_DELETED ? null : "This business was deleted, so there is nothing to retry." };
  if (job.newer) return { canRetry: false, retryNote: REPLACED_NOTE[job.newer] };
  if (job.blocked) return { canRetry: false, retryNote: job.blocked };
  return { canRetry: true, retryNote: null };
}

/**
 * Filter labels that tell repeated names apart (admin audit 2026-11-12: six agencies all named "daugr.com"). Only a
 * name that repeats gets the hint, as "Name (hint)"; when the hint repeats too, the id's start tells them apart.
 */
export function distinctLabels<T extends { id: string; name: string; hint: string | null }>(items: T[]): (T & { label: string })[] {
  const count = (key: (i: T) => string) => {
    const seen = new Map<string, number>();
    for (const i of items) seen.set(key(i), (seen.get(key(i)) ?? 0) + 1);
    return seen;
  };
  const names = count((i) => i.name.trim().toLowerCase());
  const withHint = count((i) => `${i.name.trim().toLowerCase()}|${i.hint ?? ""}`);
  return items.map((i) => {
    const name = i.name.trim().toLowerCase();
    if ((names.get(name) ?? 0) < 2) return { ...i, label: i.name };
    const hint = i.hint && (withHint.get(`${name}|${i.hint}`) ?? 0) < 2 ? i.hint : [i.hint, i.id.slice(0, 6)].filter(Boolean).join(", ");
    return { ...i, label: `${i.name} (${hint})` };
  });
}
