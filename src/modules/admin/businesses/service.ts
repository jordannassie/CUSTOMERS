// Pure rules for the admin Businesses pages (B-66, MVP_SPEC 9.1).

// Above the default 0 the schedule uses, so a support rescan is claimed before routine jobs (MVP_SPEC 6.4).
// One above the app's Run scan (100): the job row has no source column, so the value is what marks an admin scan.
export const ADMIN_SCAN_PRIORITY = 101;

export type ScanState = "queued" | "running" | "done" | "failed";

// Jobs (scan_jobs) and older runs without a job (visibility_runs) use different words for the same states.
const STATE_OF: Record<string, ScanState> = {
  queued: "queued",
  pending: "queued",
  running: "running",
  done: "done",
  completed: "done",
  failed: "failed",
};

export function toScanState(status: string): ScanState {
  return STATE_OF[status] ?? "failed";
}

export function isActive(state: ScanState): boolean {
  return state === "queued" || state === "running";
}

export function startOfMonthUtc(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

/** Credits per key, from capture rows that each cost `credits`. Rows with no key are skipped. */
export function sumBy<T>(rows: T[], key: (row: T) => string | null | undefined, credits: (row: T) => number) {
  const totals = new Map<string, number>();
  for (const row of rows) {
    const k = key(row);
    if (k) totals.set(k, (totals.get(k) ?? 0) + credits(row));
  }
  return totals;
}

/** Newest row per key, from rows already sorted newest first. */
export function firstBy<T>(rows: T[], key: (row: T) => string): Map<string, T> {
  const first = new Map<string, T>();
  for (const row of rows) if (!first.has(key(row))) first.set(key(row), row);
  return first;
}
