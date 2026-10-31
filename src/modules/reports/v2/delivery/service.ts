// Pure rules for saving and serving the version 2 report (D-90, D-92): the saved row's title, the PDF's storage path
// and file name, and how each report fix becomes an Actions row.
import type { ReportArea, ReportFix, ReportSnapshot } from "../snapshot-schema";

export const PDF_BUCKET = "reports";
/** Long enough to open and download, short enough that a copied URL stops working soon (D-90). */
export const SIGNED_URL_SECONDS = 600;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "Report Oct 28, 2026" (UTC). */
export function reportTitle(now: Date): string {
  return `Report ${MONTHS[now.getUTCMonth()]} ${now.getUTCDate()}, ${now.getUTCFullYear()}`;
}

/**
 * The reports row for a snapshot. Its sections are fixed, so `sections` stays empty. `saved`: kept with Save snapshot
 * and listed under Saved reports; false for a report saved automatically.
 */
export function reportRow(businessId: string, snapshot: ReportSnapshot, now: Date, saved = false) {
  return {
    business_id: businessId,
    saved,
    title: reportTitle(now),
    period_start: snapshot.period.start,
    period_end: snapshot.period.end,
    sections: [],
    snapshot,
    branding: {},
  };
}

/** Where one report's PDF is stored in the private bucket. */
export const pdfStoragePath = (businessId: string, reportId: string) => `${businessId}/${reportId}.pdf`;

/** "Cheezious AI visibility report 2026-10-28.pdf", without characters a file name cannot hold. */
export function pdfFileName(businessName: string, preparedAt: string): string {
  const name = businessName
    .replace(/[\\/:*?"<>|\p{Cc}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80)
    .trim();
  return `${name || "Business"} AI visibility report ${preparedAt.slice(0, 10)}.pdf`;
}

/** A report fix's Actions key (D-92): the same issue in a later report finds the row already there. */
export const fixDedupeKey = (fix: Pick<ReportFix, "key">) => `report:${fix.key}`;

// The opportunities category check (migrations 006, 013) allows these; each report area maps to one.
const CATEGORY: Partial<Record<ReportArea, string>> = {
  website: "service_page",
  google: "local_presence",
  reviews: "reviews_reputation",
};

export const fixCategory = (fix: Pick<ReportFix, "areas">) => CATEGORY[fix.areas[0]] ?? "citations";

/** "1. First step\n2. Second step": the format the Actions board splits back into steps. */
export const numberedSteps = (steps: string[]) => steps.map((s, i) => `${i + 1}. ${s}`).join("\n");

// opportunities.where_to_apply holds up to 200 characters (migration 078).
const WHERE_MAX = 200;

/** The Actions row for one report fix: suggested (open), from the report, deduped by its issue key. */
export function fixActionRow(businessId: string, fix: ReportFix) {
  return {
    business_id: businessId,
    title: fix.title,
    description: fix.why,
    evidence: fix.evidence,
    recommended_action: numberedSteps(fix.steps),
    impact: fix.impact,
    category: fixCategory(fix),
    where_to_apply: fix.where.slice(0, WHERE_MAX),
    status: "open",
    source: "report",
    dedupe_key: fixDedupeKey(fix),
  };
}
