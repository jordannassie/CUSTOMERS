import "server-only";
// Saved snapshots and the per-business section choices (migration 078). reports has an owner-only select policy and
// no write policies, so writes use the service role here after checking the business is the agency's.
import { createServiceClient } from "@/lib/supabase/service";
import { ownsBusiness } from "../dal";
import { parseDocument, type ReportDocument } from "../document";
import { loadLiveDocument } from "../live/dal";
import { parseReportSettings, type SectionId } from "../sections";
import { savedReport, snapshotRow, type SavedReport } from "../snapshot";

// Enough for two years of monthly snapshots; older ones stay saved and shared, the list shows the newest.
const MAX_LISTED = 24;

/** Newest first. Callers check the business is the agency's. */
export async function listSnapshots(businessId: string): Promise<SavedReport[]> {
  const { data, error } = await createServiceClient()
    .from("reports")
    .select("id, title, period_start, period_end")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })
    .limit(MAX_LISTED);
  if (error) throw new Error(`Reports: could not read saved reports: ${error.message}`);
  return data.map(savedReport);
}

/** The stored row for a snapshot of this business, as shareTarget reads it; null when there is none. */
export async function snapshotRecord(businessId: string, reportId: string): Promise<{ business_id: string; snapshot: unknown } | null> {
  const { data, error } = await createServiceClient()
    .from("reports")
    .select("business_id, snapshot")
    .eq("id", reportId)
    .eq("business_id", businessId)
    .maybeSingle();
  if (error) throw new Error(`Reports: could not read the saved report: ${error.message}`);
  return data;
}

/** One snapshot's document; null when it is not this business's or cannot be read. */
export async function loadSnapshot(businessId: string, reportId: string): Promise<ReportDocument | null> {
  const row = await snapshotRecord(businessId, reportId);
  return row ? parseDocument(row.snapshot) : null;
}

/** The sections the agency hid for this business. */
export async function readHidden(businessId: string): Promise<SectionId[]> {
  const { data, error } = await createServiceClient().from("businesses").select("report_settings").eq("id", businessId).maybeSingle();
  if (error) throw new Error(`Reports: could not read report settings: ${error.message}`);
  return parseReportSettings(data?.report_settings).hidden;
}

/** False when the business is not the agency's. Other keys in report_settings are kept. */
export async function saveHidden(agencyId: string, businessId: string, hidden: SectionId[]): Promise<boolean> {
  if (!(await ownsBusiness(agencyId, businessId))) return false;
  const db = createServiceClient();
  const { data, error } = await db.from("businesses").select("report_settings").eq("id", businessId).single();
  if (error) throw new Error(`Reports: could not read report settings: ${error.message}`);
  const current = data.report_settings && typeof data.report_settings === "object" && !Array.isArray(data.report_settings) ? data.report_settings : {};
  const { error: updateError } = await db
    .from("businesses")
    .update({ report_settings: { ...current, hidden } })
    .eq("id", businessId)
    .eq("agency_id", agencyId);
  if (updateError) throw new Error(`Reports: could not save report settings: ${updateError.message}`);
  return true;
}

/**
 * Freezes the live report as it is now. Null when the business is not the agency's; "empty" when there is no score yet,
 * since a snapshot of nothing would only confuse a client.
 */
export async function createSnapshot(agencyId: string, businessId: string, now: Date): Promise<SavedReport | "empty" | null> {
  if (!(await ownsBusiness(agencyId, businessId))) return null;
  const [doc, hidden] = await Promise.all([loadLiveDocument(agencyId, businessId, now), readHidden(businessId)]);
  if (!doc) return null;
  if (!doc.summary.score) return "empty";
  const { data, error } = await createServiceClient()
    .from("reports")
    .insert(snapshotRow(businessId, doc, hidden))
    .select("id, title, period_start, period_end")
    .single();
  if (error) throw new Error(`Reports: could not save the snapshot: ${error.message}`);
  return savedReport(data);
}

/** False when the snapshot is not one of this agency's. Its share links go with it (on delete cascade). */
export async function deleteSnapshot(agencyId: string, businessId: string, reportId: string): Promise<boolean> {
  if (!(await ownsBusiness(agencyId, businessId))) return false;
  const { data, error } = await createServiceClient().from("reports").delete().eq("id", reportId).eq("business_id", businessId).select("id");
  if (error) throw new Error(`Reports: could not delete the snapshot: ${error.message}`);
  return data.length > 0;
}
