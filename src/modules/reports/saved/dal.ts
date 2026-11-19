import "server-only";
// Saved reports (migration 078, D-90). reports has an owner-only select policy and no write policies, so writes use the
// service role here after checking the business is the agency's.
import { createServiceClient } from "@/lib/supabase/service";
import { ownsBusiness } from "../dal";
import { PDF_BUCKET } from "../v2/delivery/service";
import { savedReport, type SavedReport } from "./service";

// Enough for two years of monthly reports; older ones stay saved and shared, the list shows the newest.
const MAX_LISTED = 24;

/** Newest first. Callers check the business is the agency's. */
export async function listReports(businessId: string): Promise<SavedReport[]> {
  const { data, error } = await createServiceClient()
    .from("reports")
    .select("id, title, period_start, period_end, version:snapshot->version")
    .eq("business_id", businessId)
    // Only snapshots kept with Save snapshot: the reports saved automatically are reached as "Latest report".
    .eq("saved", true)
    .order("created_at", { ascending: false })
    .limit(MAX_LISTED);
  if (error) throw new Error(`Reports: could not read saved reports: ${error.message}`);
  return data.map(savedReport);
}

/** False when the report is not one of this agency's. Its share links go with it (on delete cascade), and its PDF. */
export async function deleteSnapshot(agencyId: string, businessId: string, reportId: string): Promise<boolean> {
  if (!(await ownsBusiness(agencyId, businessId))) return false;
  const db = createServiceClient();
  const { data, error } = await db.from("reports").delete().eq("id", reportId).eq("business_id", businessId).select("pdf_path");
  if (error) throw new Error(`Reports: could not delete the report: ${error.message}`);
  const paths = data.flatMap((r) => (r.pdf_path ? [r.pdf_path] : []));
  if (paths.length > 0) {
    const removed = await db.storage.from(PDF_BUCKET).remove(paths);
    // The row is gone, so nothing links to the file any more; a file left behind is only clean-up.
    if (removed.error) console.error(`Reports: could not delete a report PDF: ${removed.error.message}`);
  }
  return data.length > 0;
}
