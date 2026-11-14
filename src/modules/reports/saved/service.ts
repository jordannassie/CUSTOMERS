// The Reports page's list of saved reports (D-90). Pure.
import { periodText } from "../v2/email-text";

/** What the "Saved reports" list shows. `old`: saved before the PDF report (version 1), so it has no PDF. */
export type SavedReport = { id: string; title: string; detail: string; old: boolean };

/** "Covers Sep 28 to Oct 27, 2026" from the stored period. */
export function savedReport(row: { id: string; title: string; period_start: string; period_end: string; version: unknown }): SavedReport {
  return {
    id: row.id,
    title: row.title,
    detail: `Covers ${periodText({ start: row.period_start, end: row.period_end, days: 0 })}`,
    old: String(row.version) !== "2",
  };
}
