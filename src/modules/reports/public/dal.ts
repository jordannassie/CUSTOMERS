import "server-only";
// The public side of a share link (B-59): the report behind a token and the agency logo. report_shares has RLS with an
// owner-only select policy and nothing public, so these reads use the service role after checking the token.
import { cache } from "react";
import { env } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/service";
import { loadLiveDocument } from "../live/dal";
import { readHidden, snapshotRecord } from "../saved/dal";
import { isShareToken, logoType, storagePath, type ReportView } from "../service";
import { shareTarget } from "../snapshot";

export const LOGO_BUCKET = "business-logos";
const LOGO_MAX_BYTES = 2 * 1024 * 1024;

type Shared = {
  agencyId: string;
  businessId: string;
  agencyName: string;
  logoUrl: string | null;
  isTest: boolean;
  target: Exclude<ReturnType<typeof shareTarget>, null>;
};

// Looked up by the token itself, never compared in code. Errors never include the token. Once per request.
const sharedBusiness = cache(async (token: string): Promise<Shared | null> => {
  if (!isShareToken(token)) return null;
  const db = createServiceClient();
  const { data: share, error } = await db
    .from("report_shares")
    .select("business_id, report_id")
    .eq("token", token)
    .is("revoked_at", null)
    .maybeSingle();
  if (error) throw new Error(`Reports: could not read the share link: ${error.message}`);
  if (!share) return null;

  const [{ data: business, error: businessError }, snapshot] = await Promise.all([
    db
      .from("businesses")
      .select("agency_id, agencies!inner(name, logo_url, status, deleted_at, is_test)")
      .eq("id", share.business_id)
      .is("deleted_at", null)
      .maybeSingle(),
    share.report_id ? snapshotRecord(share.business_id, share.report_id) : null,
  ]);
  if (businessError) throw new Error(`Reports: could not read the business: ${businessError.message}`);
  if (!business?.agency_id) return null;
  // A suspended or deleted agency's links stop working at once (B9); they open again if it is reinstated.
  if (business.agencies.status === "suspended" || business.agencies.status === "deleted" || business.agencies.deleted_at) return null;
  const target = shareTarget(share, snapshot, share.business_id);
  if (!target) return null;
  return {
    agencyId: business.agency_id,
    businessId: share.business_id,
    agencyName: business.agencies.name,
    logoUrl: business.agencies.logo_url,
    isTest: business.agencies.is_test,
    target,
  };
});

/** Whether a share link still opens a report, checked before the page starts streaming so it can answer 404. */
export async function isShareLinkActive(token: string): Promise<boolean> {
  return (await sharedBusiness(token)) !== null;
}

/** The public report behind a share link: its snapshot, or the live report; null when unknown or turned off. */
export async function getSharedReport(token: string): Promise<ReportView | null> {
  const shared = await sharedBusiness(token);
  if (!shared) return null;
  const [document, hidden] = await Promise.all([
    shared.target.kind === "snapshot" ? shared.target.doc : loadLiveDocument(shared.agencyId, shared.businessId, new Date()),
    readHidden(shared.businessId),
  ]);
  if (!document) return null;
  return {
    agency: { name: shared.agencyName, hasLogo: logoPath(shared.logoUrl) !== null, isTest: shared.isTest },
    document,
    hidden,
    kind: shared.target.kind,
  };
}

export function logoPath(logoUrl: string | null): string | null {
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
