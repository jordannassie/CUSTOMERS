// Saved reports: frozen snapshots of the report document, so a shared snapshot never changes under a client, and the
// live monthly report next to them, worked out on read. Pure.
import { reportDay } from "@/lib/report-dates";
import { documentPeriod } from "./build";
import { parseDocument, type ReportDocument } from "./document";
import { visibleSections, type SectionId } from "./sections";

/** What the "Saved reports" list shows. `id` null is the live report. */
export type SavedReport = { id: string | null; title: string; detail: string };

export const LIVE_REPORT: SavedReport = { id: null, title: "Live report", detail: "Last 30 days, updates after each scan" };

export function snapshotTitle(now: Date): string {
  return `Snapshot ${reportDay(now, true)}`;
}

/** The reports row for a snapshot of `doc`; `hidden` is kept as a record of what was shown when it was saved. */
export function snapshotRow(businessId: string, doc: ReportDocument, hidden: readonly SectionId[]) {
  const period = documentPeriod(doc);
  return {
    business_id: businessId,
    title: snapshotTitle(new Date(doc.preparedAt)),
    period_start: period.start,
    period_end: period.end,
    sections: visibleSections(hidden),
    snapshot: doc,
    branding: {},
  };
}

/** "Covers Sep 28 to Oct 27, 2026" from the stored period (UTC dates). */
export function savedReport(row: { id: string; title: string; period_start: string; period_end: string }): SavedReport {
  const day = (iso: string, year: boolean) => reportDay(new Date(`${iso}T00:00:00Z`), year);
  const sameYear = row.period_start.slice(0, 4) === row.period_end.slice(0, 4);
  return { id: row.id, title: row.title, detail: `Covers ${day(row.period_start, !sameYear)} to ${day(row.period_end, true)}` };
}

/**
 * What a share link opens: a link with a report id shows that snapshot; one without shows the live report. A link to
 * a snapshot that is gone or unreadable shows nothing, never the live report in its place.
 */
export function shareTarget(
  share: { report_id: string | null },
  snapshot: { business_id: string; snapshot: unknown } | null,
  businessId: string,
): { kind: "live" } | { kind: "snapshot"; doc: ReportDocument } | null {
  if (!share.report_id) return { kind: "live" };
  if (!snapshot || snapshot.business_id !== businessId) return null;
  const doc = parseDocument(snapshot.snapshot);
  return doc ? { kind: "snapshot", doc } : null;
}
