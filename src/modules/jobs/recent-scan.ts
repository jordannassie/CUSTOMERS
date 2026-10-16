// Run scan after a scan in the last 24 hours (2026-10-15, D-54). Charging is unchanged: inside 20 hours the answers
// come from the shared cache (cache.ts, H1) and each check still uses a credit, so the user is asked first; the scan
// history shows how many were reused. Pure, so it is unit tested.

export const RECENT_SCAN_HOURS = 24;

/** True when the last finished scan is less than 24 hours old. */
export function scannedRecently(lastDoneAt: string | null, now = new Date()): boolean {
  if (!lastDoneAt) return false;
  const age = now.getTime() - new Date(lastDoneAt).getTime();
  return age >= 0 && age < RECENT_SCAN_HOURS * 60 * 60 * 1000;
}

const credits = (n: number) => `${n} ${n === 1 ? "credit" : "credits"}`;

/** What the user reads before scanning again; the dialog's title asks "Scan again?". */
export function recentScanWarning(cost: number): string {
  return `You scanned in the last 24 hours. Most answers will be the same as the last scan and still use ${credits(cost)}.`;
}

/** startScan's answer when the business was scanned in the last 24 hours and the user has not confirmed. */
export type RecentScanNeeded = { ok: false; status: 428; error: string; recentScan: { cost: number } };

export function recentScanNeeded(cost: number): RecentScanNeeded {
  return { ok: false, status: 428, error: recentScanWarning(cost), recentScan: { cost } };
}
