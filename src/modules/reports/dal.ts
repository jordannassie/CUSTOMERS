import "server-only";
// Share links (B-59). report_shares has RLS with an owner-only select policy and nothing public, so the
// writes and the public read use the service role here, after checking ownership or the token.
import { env } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAgency } from "@/modules/auth";
import { fetchPlaceSignals, loadCompetitorsPage } from "@/modules/competitors";
import { loadOverview } from "@/modules/overview";
import { SCORE_WINDOW_DAYS } from "@/modules/scanning";
import { isShareToken, logoType, newShareToken, reportView, sharePath, storagePath, type ReportView } from "./service";

const LOGO_BUCKET = "business-logos";
const LOGO_MAX_BYTES = 2 * 1024 * 1024;

export type ShareLink = { id: string; path: string };

async function ownsBusiness(agencyId: string, businessId: string): Promise<boolean> {
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

async function activeShare(businessId: string): Promise<ShareLink | null> {
  const { data, error } = await createServiceClient()
    .from("report_shares")
    .select("id, token")
    .eq("business_id", businessId)
    .is("revoked_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`Reports: could not read share links: ${error.message}`);
  return data && { id: data.id, path: sharePath(data.token) };
}

/** The live share link for one of the signed-in agency's businesses, if it has one. */
export async function getShareLink(businessId: string): Promise<ShareLink | null> {
  const { agency } = await requireAgency({ next: "/dashboard" });
  if (!(await ownsBusiness(agency.id, businessId))) return null;
  return activeShare(businessId);
}

/** Reuses the live link, so pressing Share twice never leaves two links to turn off. Null when not the agency's business. */
export async function createShare(agencyId: string, businessId: string): Promise<ShareLink | null> {
  if (!(await ownsBusiness(agencyId, businessId))) return null;
  const existing = await activeShare(businessId);
  if (existing) return existing;
  const token = newShareToken();
  const { data, error } = await createServiceClient()
    .from("report_shares")
    .insert({ business_id: businessId, token })
    .select("id")
    .single();
  if (error) throw new Error(`Reports: could not create the share link: ${error.message}`);
  return { id: data.id, path: sharePath(token) };
}

/**
 * Runs `print` with a live share page for one of the agency's businesses (B-60). Reuses the live link; a link
 * made only for the PDF is turned off again afterwards, so exporting never leaves a public link the agency did
 * not choose to share. Null when not the agency's business.
 */
export async function withSharePage<T>(
  agencyId: string,
  businessId: string,
  print: (page: { path: string; businessName: string }) => Promise<T>,
): Promise<T | null> {
  const { data: business, error } = await createServiceClient()
    .from("businesses")
    .select("name")
    .eq("id", businessId)
    .eq("agency_id", agencyId)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw new Error(`Reports: could not read the business: ${error.message}`);
  if (!business) return null;

  const existing = await activeShare(businessId);
  const link = existing ?? (await createShare(agencyId, businessId));
  if (!link) return null;
  try {
    return await print({ path: link.path, businessName: business.name });
  } finally {
    // Only this one row: a link the agency makes meanwhile from Share must stay on.
    if (!existing) {
      const { error: revokeError } = await createServiceClient()
        .from("report_shares")
        .update({ revoked_at: new Date().toISOString() })
        .eq("id", link.id);
      if (revokeError) throw new Error(`Reports: could not turn off the PDF link: ${revokeError.message}`);
    }
  }
}

/**
 * The share link for the weekly report email (B-62): the live one, or a new one through createShare. Null when
 * any link for the business was turned off before, so an email never switches a report back on without them.
 * That includes the short-lived PDF links (withSharePage), which cannot be told apart from the agency's own.
 */
export async function shareForEmail(agencyId: string, businessId: string): Promise<ShareLink | null> {
  const existing = await activeShare(businessId);
  if (existing) return (await ownsBusiness(agencyId, businessId)) ? existing : null;
  const { count, error } = await createServiceClient()
    .from("report_shares")
    .select("id", { count: "exact", head: true })
    .eq("business_id", businessId)
    .not("revoked_at", "is", null);
  if (error) throw new Error(`Reports: could not read share links: ${error.message}`);
  return count ? null : createShare(agencyId, businessId);
}

/** False when the link is not one of this agency's. Turning off a link that is already off is fine. */
export async function revokeShare(agencyId: string, id: string): Promise<boolean> {
  const db = createServiceClient();
  const { data: share, error } = await db.from("report_shares").select("business_id").eq("id", id).maybeSingle();
  if (error) throw new Error(`Reports: could not read the share link: ${error.message}`);
  if (!share || !(await ownsBusiness(agencyId, share.business_id))) return false;
  // Every live link for the business, so a second link from a double click can never stay on unseen.
  const { error: updateError } = await db
    .from("report_shares")
    .update({ revoked_at: new Date().toISOString() })
    .eq("business_id", share.business_id)
    .is("revoked_at", null);
  if (updateError) throw new Error(`Reports: could not turn off the share link: ${updateError.message}`);
  return true;
}

type Shared = { agencyId: string; businessId: string; businessName: string; agencyName: string; logoUrl: string | null };

// Looked up by the token itself, never compared in code. Errors never include the token.
async function sharedBusiness(token: string): Promise<Shared | null> {
  if (!isShareToken(token)) return null;
  const db = createServiceClient();
  const { data: share, error } = await db
    .from("report_shares")
    .select("business_id")
    .eq("token", token)
    .is("revoked_at", null)
    .maybeSingle();
  if (error) throw new Error(`Reports: could not read the share link: ${error.message}`);
  if (!share) return null;

  const { data: business, error: businessError } = await db
    .from("businesses")
    .select("name, agency_id, agencies!inner(name, logo_url)")
    .eq("id", share.business_id)
    .is("deleted_at", null)
    .maybeSingle();
  if (businessError) throw new Error(`Reports: could not read the business: ${businessError.message}`);
  if (!business?.agency_id) return null;
  return {
    agencyId: business.agency_id,
    businessId: share.business_id,
    businessName: business.name,
    agencyName: business.agencies.name,
    logoUrl: business.agencies.logo_url,
  };
}

/** Whether a share link still opens a report, checked before the page starts streaming so it can answer 404. */
export async function isShareLinkActive(token: string): Promise<boolean> {
  return (await sharedBusiness(token)) !== null;
}

/** The public report behind a share link; null when the link is unknown or turned off. */
export async function getSharedReport(token: string): Promise<ReportView | null> {
  const shared = await sharedBusiness(token);
  if (!shared) return null;
  const now = new Date();
  const [overview, competitors] = await Promise.all([
    loadOverview(shared.agencyId, shared.businessId, now),
    loadCompetitorsPage(shared.agencyId, shared.businessId, now, fetchPlaceSignals),
  ]);
  if (!overview || !competitors) return null;
  return reportView({
    agency: { name: shared.agencyName, hasLogo: logoPath(shared.logoUrl) !== null },
    businessName: shared.businessName,
    now,
    windowDays: SCORE_WINDOW_DAYS,
    overview,
    competitors,
  });
}

function logoPath(logoUrl: string | null): string | null {
  return logoUrl ? storagePath(logoUrl, env.NEXT_PUBLIC_SUPABASE_URL, LOGO_BUCKET) : null;
}

/**
 * The agency logo for a share link. Served through the link because the stored URL holds the agency id;
 * only files in our own bucket are read, so no outside URL is ever fetched.
 */
export async function getSharedLogo(token: string): Promise<{ bytes: ArrayBuffer; type: string } | null> {
  const shared = await sharedBusiness(token);
  const path = shared && logoPath(shared.logoUrl);
  if (!path) return null;
  const { data, error } = await createServiceClient().storage.from(LOGO_BUCKET).download(path);
  if (error || !data || data.size > LOGO_MAX_BYTES) return null;
  const bytes = await data.arrayBuffer();
  const type = logoType(new Uint8Array(bytes, 0, Math.min(bytes.byteLength, 16)));
  return type ? { bytes, type } : null;
}
