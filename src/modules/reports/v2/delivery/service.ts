// Pure rules for saving and serving the version 2 report (D-90, D-92): the saved row's title, the PDF's storage path
// and file name, and how each report fix becomes an Actions row.
import { OPEN_FIX_STATUSES } from "@/lib/fix-status";
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

/**
 * "Cheezious AI visibility report 2026-10-28.pdf", without characters a file name cannot hold. Plain ASCII only:
 * storage percent-encodes anything else into the saved name ("Brian%E2%80%99s", audit 2026-11-12), so curly quotes
 * turn straight and accents drop ("Devoción" saves as "Devocion").
 */
export function pdfFileName(businessName: string, preparedAt: string): string {
  const name = businessName
    .replace(/[\u2018\u2019\u201B\u2032]/g, "'")
    .replace(/[\u201C\u201D\u201F\u2033]/g, " ")
    .replace(/[\u2013\u2014]/g, "-")
    .normalize("NFKD")
    .replace(/[^\x20-\x7E]/g, "")
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

/** What an earlier report's fix says when the latest report no longer flags it: no old count is left on show. */
export const NO_LONGER_FLAGGED = "The latest report no longer flags this. AI used it less in the last 30 days.";

type SavedFix = { id: string; dedupe_key: string | null; status: string; evidence: string | null; impact: string | null };

/**
 * The open report fixes in Actions whose evidence or impact differ from the latest report: brought up to its numbers,
 * or marked as no longer flagged. Done and dismissed fixes are the owner's record and stay as they are. Pure.
 */
export function refreshedFixes(saved: SavedFix[], fixes: ReportFix[]): { id: string; set: { evidence: string; impact?: ReportFix["impact"] } }[] {
  const latest = new Map(fixes.map((f) => [fixDedupeKey(f), f]));
  const out: { id: string; set: { evidence: string; impact?: ReportFix["impact"] } }[] = [];
  for (const row of saved) {
    if (!row.dedupe_key || !OPEN_FIX_STATUSES.includes(row.status)) continue;
    const fix = latest.get(row.dedupe_key);
    if (fix) {
      if (row.evidence !== fix.evidence || row.impact !== fix.impact) out.push({ id: row.id, set: { evidence: fix.evidence, impact: fix.impact } });
    } else if (row.evidence !== NO_LONGER_FLAGGED) {
      out.push({ id: row.id, set: { evidence: NO_LONGER_FLAGGED } });
    }
  }
  return out;
}
