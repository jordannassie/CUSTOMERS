// Run scan after a scan in the last 20 hours (2026-10-15, D-24). Inside 20 hours most answers come from the shared
// cache (cache.ts, H1) and are free (D-24, 2026-10-20), so the user is told the results will mostly repeat; the scan
// history shows how many were reused. The window matches the cache's (BUG-199). Pure, so it is unit tested.

export const RECENT_SCAN_HOURS = 20;

/** True when the last finished scan is less than 20 hours old, so its answers can still be reused. */
export function scannedRecently(lastDoneAt: string | null, now = new Date()): boolean {
  if (!lastDoneAt) return false;
  const age = now.getTime() - new Date(lastDoneAt).getTime();
  return age >= 0 && age < RECENT_SCAN_HOURS * 60 * 60 * 1000;
}

/** What the user reads before scanning again; the dialog's title asks "Scan again?". */
export function recentScanWarning(): string {
  return "You scanned in the last 20 hours, so most answers will be the same as last time. Reused answers don't use credits.";
}

/** startScan's answer when the business was scanned in the last 20 hours and the user has not confirmed. */
export type RecentScanNeeded = { ok: false; status: 428; error: string; recentScan: { cost: number } };

export function recentScanNeeded(cost: number): RecentScanNeeded {
  return { ok: false, status: 428, error: recentScanWarning(), recentScan: { cost } };
}
