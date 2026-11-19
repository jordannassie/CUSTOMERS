import "server-only";
// Share links (B-59). report_shares has RLS with an owner-only select policy and nothing public, so the
// writes and the public read use the service role here, after checking ownership or the token.
// A link opens the current report's PDF (report_id null) or one saved report's (migration 078); each has its own link.
import { createServiceClient } from "@/lib/supabase/service";
import { requireAgency } from "@/modules/auth";
import { newShareToken, sharePath } from "./service";

export type ShareLink = { id: string; path: string };

/** Null is the live report; otherwise a snapshot of the same business. */
type ReportId = string | null;

export async function ownsBusiness(agencyId: string, businessId: string): Promise<boolean> {
  const { data, error } = await createServiceClient()
    .from("businesses")
    .select("id")
    .eq("id", businessId)
    .eq("agency_id", agencyId)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw new Error(`Reports: could not read the business: ${error.message}`);
  return data !== null;
}

async function ownsReport(businessId: string, reportId: ReportId): Promise<boolean> {
  if (reportId === null) return true;
  const { data, error } = await createServiceClient().from("reports").select("id").eq("id", reportId).eq("business_id", businessId).maybeSingle();
  if (error) throw new Error(`Reports: could not read the saved report: ${error.message}`);
  return data !== null;
}

// The agency's own link. Old PDF export links (for_pdf, before D-90) are never handed out.
async function activeShare(businessId: string, reportId: ReportId = null): Promise<ShareLink | null> {
  const query = createServiceClient()
    .from("report_shares")
    .select("id, token")
    .eq("business_id", businessId)
    .eq("for_pdf", false)
    .is("revoked_at", null);
  const { data, error } = await (reportId === null ? query.is("report_id", null) : query.eq("report_id", reportId))
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`Reports: could not read share links: ${error.message}`);
  return data && { id: data.id, path: sharePath(data.token) };
}

/** The share link for one of the signed-in agency's reports (the live one by default), if it has one. */
export async function getShareLink(businessId: string, reportId: ReportId = null): Promise<ShareLink | null> {
  const { agency } = await requireAgency({ next: "/dashboard" });
  if (!(await ownsBusiness(agency.id, businessId))) return null;
  return activeShare(businessId, reportId);
}

/**
 * Reuses the report's live link, so pressing Share twice never leaves two links to turn off. Null when the business
 * or the snapshot is not the agency's.
 */
export async function createShare(agencyId: string, businessId: string, reportId: ReportId = null): Promise<ShareLink | null> {
  if (!(await ownsBusiness(agencyId, businessId)) || !(await ownsReport(businessId, reportId))) return null;
  const existing = await activeShare(businessId, reportId);
  if (existing) return existing;
  const token = newShareToken();
  const { data, error } = await createServiceClient()
    .from("report_shares")
    .insert({ business_id: businessId, token, report_id: reportId })
    .select("id")
    .single();
  if (error) throw new Error(`Reports: could not create the share link: ${error.message}`);
  return { id: data.id, path: sharePath(token) };
}

/**
 * The share link for the weekly report email (B-62): the live one, or a new one through createShare. Null when
 * the agency turned a link for the business off before, so an email never switches a report back on without them.
 * Old PDF export links (for_pdf) do not count.
 */
export async function shareForEmail(agencyId: string, businessId: string): Promise<ShareLink | null> {
  const existing = await activeShare(businessId);
  if (existing) return (await ownsBusiness(agencyId, businessId)) ? existing : null;
  const { count, error } = await createServiceClient()
    .from("report_shares")
    .select("id", { count: "exact", head: true })
    .eq("business_id", businessId)
    .eq("for_pdf", false)
    .is("report_id", null)
    .not("revoked_at", "is", null);
  if (error) throw new Error(`Reports: could not read share links: ${error.message}`);
  return count ? null : createShare(agencyId, businessId);
}

/** False when the link is not one of this agency's. Turning off a link that is already off is fine. */
export async function revokeShare(agencyId: string, id: string): Promise<boolean> {
  const db = createServiceClient();
  const { data: share, error } = await db.from("report_shares").select("business_id, report_id").eq("id", id).maybeSingle();
  if (error) throw new Error(`Reports: could not read the share link: ${error.message}`);
  if (!share || !(await ownsBusiness(agencyId, share.business_id))) return false;
  // Every live link for the same report, so a second link from a double click can never stay on unseen.
  const query = db
    .from("report_shares")
    .update({ revoked_at: new Date().toISOString() })
    .eq("business_id", share.business_id)
    .eq("for_pdf", false)
    .is("revoked_at", null);
  const { error: updateError } = await (share.report_id === null ? query.is("report_id", null) : query.eq("report_id", share.report_id));
  if (updateError) throw new Error(`Reports: could not turn off the share link: ${updateError.message}`);
  return true;
}
