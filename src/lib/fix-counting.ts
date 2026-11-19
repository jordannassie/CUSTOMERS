// Which counting rules wrote a scan fix's numbers ("AI cited google.com in 12 of your answers"). Scan fixes are written
// once per scan, so after a counting change (Google Maps search links stopped counting as sources, 2026-11-13) an open
// fix kept its old numbers until the next scan. Bump this when the counting changes; the Actions board then shows a
// plain note instead of numbers from older rules (MVP gap 5, 2026-11-16). Same idea as REPORT_COUNTING for reports.
export const SCAN_FIX_COUNTING = 2;

export const OLDER_COUNT_NOTE = "The numbers here are from an older count. They update after the next scan.";

/** The counting version saved with a scan fix (evidence_data.counting); 1 for fixes written before versions. */
export function fixCounting(evidenceData: unknown): number {
  const value = evidenceData && typeof evidenceData === "object" ? (evidenceData as { counting?: unknown }).counting : undefined;
  return typeof value === "number" ? value : 1;
}

/** True when an open scan fix's numbers come from older counting rules. Done and dismissed fixes keep their text. */
export function fromOlderCount(row: { source?: string | null; status?: string | null; evidence_data?: unknown }): boolean {
  const scanFix = (row.source ?? "scan") === "scan";
  const open = row.status !== "done" && row.status !== "dismissed" && row.status !== "completed";
  return scanFix && open && fixCounting(row.evidence_data) < SCAN_FIX_COUNTING;
}
