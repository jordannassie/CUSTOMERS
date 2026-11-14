import "server-only";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * The business a scan job belongs to, for the admin history row (admin audit 2026-11-12: "Retried a scan" rows had no
 * business once the job was gone). Null when the job or business is not found. Callers check admin access.
 */
export async function scanJobBusiness(jobId: string): Promise<{ id: string; name: string } | null> {
  const { data, error } = await createServiceClient()
    .from("scan_jobs")
    .select("business_id, businesses(name)")
    .eq("id", jobId)
    .maybeSingle();
  if (error || !data) return null;
  const name = (data.businesses as { name: string } | null)?.name;
  return name ? { id: data.business_id, name } : null;
}
