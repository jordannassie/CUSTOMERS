// Finished scans whose fixes never came (MVP_SPEC 7.2): the worker ran out of time before the explanation, or the
// host stopped it part way. The scan worker's sweep (jobs/worker.ts) explains them later. Pure, so it is unit tested.

// The host stops a background function after 15 minutes, so a run this old has no worker still explaining it.
export const SWEEP_MIN_AGE_MS = 15 * 60_000;
// The worker only runs while scans are queued (029_scan_schedules.sql), so the sweep looks back a whole day.
export const SWEEP_MAX_AGE_MS = 24 * 3_600_000;

export type SweepRun = { id: string; businessId: string; completedAt: string };

/** The finished-at window the sweep looks in: old enough that no worker is on it, recent enough to still matter. */
export function sweepWindow(now: Date): { from: string; to: string } {
  return {
    from: new Date(now.getTime() - SWEEP_MAX_AGE_MS).toISOString(),
    to: new Date(now.getTime() - SWEEP_MIN_AGE_MS).toISOString(),
  };
}

/**
 * Splits the unexplained runs: the latest finished scan of each business is explained (newest first, at most `limit`);
 * a run that a newer finished scan replaced is only marked, since its fixes would be thrown away (saveExplanation).
 * `completed` is every finished run of those businesses from the window's start on, explained or not.
 */
export function sweepPlan(unexplained: SweepRun[], completed: SweepRun[], limit: number): { explain: string[]; superseded: string[] } {
  const latest = new Map<string, SweepRun>();
  for (const run of [...completed, ...unexplained]) {
    const seen = latest.get(run.businessId);
    if (!seen || Date.parse(run.completedAt) > Date.parse(seen.completedAt)) latest.set(run.businessId, run);
  }
  const explain: string[] = [];
  const superseded: string[] = [];
  const newestFirst = [...unexplained].sort((a, b) => Date.parse(b.completedAt) - Date.parse(a.completedAt));
  for (const run of newestFirst) {
    if (latest.get(run.businessId)?.id !== run.id) superseded.push(run.id);
    else if (explain.length < limit) explain.push(run.id);
  }
  return { explain, superseded };
}
