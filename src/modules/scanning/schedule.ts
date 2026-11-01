// When a business is scanned next (MVP_SPEC 6.2, H1). Pure, so it is unit tested.
//
// enqueue-due-scans runs once a day at 02:00 UTC (migration 029) and queues every business due that day. The shared
// answer cache keeps an answer for CACHE_TTL_MS (20 hours, cache.ts). A finished scan's next scan lands on a 02:00 run
// at least MIN_SCAN_GAP_MS later, so a scheduled scan never reuses, and pays again for, an answer the same business
// got in its last scan: a first scan at 15:00 is not scanned again at 02:00 the next day, 11 hours later, but at
// 02:00 the day after. A daily scan that finishes after 06:00 UTC (a long queue) moves one day on for the same reason.

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/** The hour (UTC) of the daily enqueue-due-scans run. */
export const SCHEDULED_RUN_HOUR_UTC = 2;
/** The shortest time between a finished scan and the next scheduled one; the answer cache window must not exceed it. */
export const MIN_SCAN_GAP_MS = 20 * HOUR_MS;

const FREQUENCY_DAYS: Record<string, number> = { daily: 1, weekly: 7, monthly: 30 };

/** 02:00 UTC on the day of `at`. */
function runOnDayOf(at: Date): Date {
  return new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), at.getUTCDate(), SCHEDULED_RUN_HOUR_UTC));
}

/** The first scheduled run at or after `at`. */
export function scheduledRunAtOrAfter(at: Date): Date {
  const run = runOnDayOf(at);
  return run.getTime() >= at.getTime() ? run : new Date(run.getTime() + DAY_MS);
}

/**
 * The next scan after one that finished at `from`: the run on the day the frequency points to (as enqueue-due-scans
 * queues a business due that day), but never sooner than MIN_SCAN_GAP_MS after `from`.
 */
export function nextScanAt(frequency: string, from: Date): Date {
  const byFrequency = runOnDayOf(new Date(from.getTime() + (FREQUENCY_DAYS[frequency] ?? 7) * DAY_MS));
  const earliest = scheduledRunAtOrAfter(new Date(from.getTime() + MIN_SCAN_GAP_MS));
  return byFrequency.getTime() >= earliest.getTime() ? byFrequency : earliest;
}
