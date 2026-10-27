import "server-only";
// The Reports page (dashboard redesign, 7. Reports): the chosen report as a document, the saved reports, the hidden
// sections, the agency's branding and the chosen report's share link, for one of the signed-in agency's businesses.
import { createServiceClient } from "@/lib/supabase/service";
import { requireAgency } from "@/modules/auth";
import { getShareLink, ownsBusiness, type ShareLink } from "../dal";
import { loadLiveDocument } from "../live/dal";
import { logoPath } from "../public/dal";
import { listSnapshots, loadSnapshot, readHidden } from "../saved/dal";
import type { ReportView } from "../service";
import { LIVE_REPORT, type SavedReport } from "../snapshot";

export type ReportsPage = {
  /** The live report first, then snapshots, newest first. */
  saved: SavedReport[];
  /** The chosen report; null is the live one. */
  selected: string | null;
  view: ReportView;
  share: ShareLink | null;
  /** The logo uploaded in Settings, shown on the page; the share page serves it through its own link. */
  logoSrc: string | null;
};

/** Null when the business is not the agency's; "missing" when the chosen snapshot is not one of its reports. */
export async function getReportsPage(businessId: string, reportId: string | null): Promise<ReportsPage | "missing" | null> {
  const { agency } = await requireAgency({ next: "/reports" });
  if (!(await ownsBusiness(agency.id, businessId))) return null;
  const now = new Date();
  const [document, snapshots, hidden, share, logo] = await Promise.all([
    reportId ? loadSnapshot(businessId, reportId) : loadLiveDocument(agency.id, businessId, now),
    listSnapshots(businessId),
    readHidden(businessId),
    getShareLink(businessId, reportId),
    createServiceClient().from("agencies").select("logo_url").eq("id", agency.id).single(),
  ]);
  if (logo.error) throw new Error(`Reports: could not read the agency: ${logo.error.message}`);
  if (!document) return reportId ? "missing" : null;
  const logoUrl = logoPath(logo.data.logo_url) ? logo.data.logo_url : null;
  return {
    saved: [LIVE_REPORT, ...snapshots],
    selected: reportId,
    view: {
      agency: { name: agency.name, hasLogo: logoUrl !== null, isTest: agency.isTest },
      document,
      hidden,
      kind: reportId ? "snapshot" : "live",
    },
    share,
    logoSrc: logoUrl,
  };
}
