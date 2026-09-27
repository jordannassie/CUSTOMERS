// Pure rules for the admin Scans page (B-67, MVP_SPEC 9.1).

/** Milliseconds from start to finish, or null while a job has not both started and finished. */
export function durationMs(startedAt: string | null, finishedAt: string | null): number | null {
  if (!startedAt || !finishedAt) return null;
  const ms = new Date(finishedAt).getTime() - new Date(startedAt).getTime();
  return ms >= 0 ? ms : null;
}

export function formatDuration(ms: number | null): string {
  if (ms === null) return "";
  if (ms < 1000) return `${ms} ms`;
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
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
