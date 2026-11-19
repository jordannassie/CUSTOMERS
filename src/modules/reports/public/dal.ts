import "server-only";
// The public side of a share link (B-59, D-90): the PDF behind a token. report_shares has RLS with an owner-only select
// policy and nothing public, so these reads use the service role after checking the token.
import { createServiceClient } from "@/lib/supabase/service";
import { currentReport } from "../v2/delivery/dal";
import { reportPdfPath, signedPdfUrl } from "../v2/delivery/stored/dal";
import { isShareToken, shareLinkOpens } from "../service";

type Shared = { agencyId: string; businessId: string; reportId: string | null };

// Looked up by the token itself, never compared in code. Errors never include the token.
async function sharedTarget(token: string, now: Date): Promise<Shared | null> {
  if (!isShareToken(token)) return null;
  const db = createServiceClient();
  const { data: share, error } = await db
    .from("report_shares")
    .select("business_id, report_id, for_pdf, created_at")
    .eq("token", token)
    .is("revoked_at", null)
    .maybeSingle();
  if (error) throw new Error(`Reports: could not read the share link: ${error.message}`);
  // An old PDF export's link (for_pdf, from before D-90) stops opening after a few minutes.
  if (!share || !shareLinkOpens(share, now)) return null;

  const { data: business, error: businessError } = await db
    .from("businesses")
    .select("agency_id, agencies!inner(status, deleted_at)")
    .eq("id", share.business_id)
    .is("deleted_at", null)
    .maybeSingle();
  if (businessError) throw new Error(`Reports: could not read the business: ${businessError.message}`);
  if (!business?.agency_id) return null;
  // A suspended or deleted agency's links stop working at once (B9); they open again if it is reinstated.
  if (business.agencies.status === "suspended" || business.agencies.status === "deleted" || business.agencies.deleted_at) return null;
  return { agencyId: business.agency_id, businessId: share.business_id, reportId: share.report_id };
}

/**
 * A fresh signed URL that opens the PDF behind a share link: the saved report it points at, or the current report for
 * a live link. Null when the link is unknown, turned off, its report is gone or uses the old layout, or there are no
 * answers to report on yet.
 */
export async function sharedPdfUrl(token: string, now = new Date()): Promise<string | null> {
  const shared = await sharedTarget(token, now);
  if (!shared) return null;
  const report = shared.reportId ? { id: shared.reportId } : await currentReport(shared.agencyId, shared.businessId, now);
  if (!report || report === "empty") return null;
  const path = await reportPdfPath(shared.businessId, report.id);
  if (!path || path === "old") return null;
  return signedPdfUrl(path, null);
}

