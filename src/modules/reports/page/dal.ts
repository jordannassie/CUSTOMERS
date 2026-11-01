import "server-only";
// The Reports page (D-90): the shown report's summary and fixes from its snapshot, the saved reports, the share link and
// the agency's report branding, for one of the signed-in agency's businesses.
import { createServiceClient } from "@/lib/supabase/service";
import { requireAgency } from "@/modules/auth";
import { getShareLink, ownsBusiness, type ShareLink } from "../dal";
import { logoPath } from "../logo";
import { listReports } from "../saved/dal";
import type { SavedReport } from "../saved/service";
import { readBranding, type Branding } from "../v2/branding";
import { currentReport, readReport, type SavedV2 } from "../v2/delivery/dal";
import { emailSnapshot, type EmailSnapshot } from "../v2/email-text";
import type { ReportFix, ReportSnapshot } from "../v2/snapshot-schema";

/** One fix as the page shows it: its row, and what opens under it. */
export type ShownFix = Pick<ReportFix, "n" | "title" | "where" | "priority" | "impact" | "effort" | "owner" | "evidence" | "why" | "steps" | "goal">;

/** What the page shows for one report, all from its frozen snapshot: the summary page and every fix. */
export type ShownReport = {
  id: string;
  preparedAt: string;
  /** The numbers and top fixes, as the email summary has them. */
  summary: EmailSnapshot;
  headline: string;
  lead: string;
  short: ReportSnapshot["summary"]["short"];
  fixes: ShownFix[];
};

export type ReportsPage = {
  reports: SavedReport[];
  /** The chosen saved report; null is the current one. */
  selected: string | null;
  /** "old": a saved report from before the PDF (version 1); "empty": no answers to report on yet. */
  shown: ShownReport | "old" | "empty";
  share: ShareLink | null;
  agencyName: string;
  branding: Branding;
  /** The logo uploaded in Settings, shown on the branding card. */
  logoSrc: string | null;
};

const shownOf = ({ id, snapshot }: SavedV2): ShownReport => ({
  id,
  preparedAt: snapshot.preparedAt,
  summary: emailSnapshot(snapshot),
  headline: snapshot.summary.headline,
  lead: snapshot.summary.lead,
  short: snapshot.summary.short,
  fixes: snapshot.fixes.map(({ n, title, where, priority, impact, effort, owner, evidence, why, steps, goal }) => ({
    n,
    title,
    where,
    priority,
    impact,
    effort,
    owner,
    evidence,
    why,
    steps,
    goal,
  })),
});

/** Null when the business is not the agency's; "missing" when the chosen report is not one of its reports. */
export async function getReportsPage(businessId: string, reportId: string | null): Promise<ReportsPage | "missing" | null> {
  const { agency } = await requireAgency({ next: "/reports" });
  if (!(await ownsBusiness(agency.id, businessId))) return null;
  const now = new Date();
  // The current report first: it may save a new row, which the list then shows.
  const report = reportId ? await readReport(businessId, reportId) : await currentReport(agency.id, businessId, now);
  if (report === null && reportId) return "missing";
  const [reports, share, agencyRow] = await Promise.all([
    listReports(businessId),
    getShareLink(businessId, reportId),
    createServiceClient().from("agencies").select("logo_url, report_branding").eq("id", agency.id).single(),
  ]);
  if (agencyRow.error) throw new Error(`Reports: could not read the agency: ${agencyRow.error.message}`);
  const logoUrl = logoPath(agencyRow.data.logo_url) ? agencyRow.data.logo_url : null;
  return {
    reports,
    selected: reportId,
    shown: report === "old" ? "old" : report === "empty" || report === null ? "empty" : shownOf(report),
    share,
    agencyName: agency.name,
    branding: readBranding(agencyRow.data.report_branding),
    logoSrc: logoUrl,
  };
}

/** Saves the agency's report branding (D-90). Saved reports keep theirs; the current report is made again with it. */
export async function saveBranding(agencyId: string, branding: { accent: string | null; contactEmail: string | null; bookingUrl: string | null }): Promise<void> {
  const value = Object.fromEntries(Object.entries(branding).filter(([, v]) => v !== null));
  const { error } = await createServiceClient().from("agencies").update({ report_branding: value }).eq("id", agencyId);
  if (error) throw new Error(`Reports: could not save the branding: ${error.message}`);
}
