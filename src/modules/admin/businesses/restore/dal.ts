import "server-only";
import { createServiceClient } from "@/lib/supabase/service";

export type RestoreRefusal = "not_found" | "not_deleted" | "too_late" | "agency_deleted";
export type RestoreResult = { ok: true; deletedAt: string } | { ok: false; reason: RestoreRefusal };

/**
 * Brings back a deleted business inside its waiting period (MVP_SPEC 23, "same pattern" as an account). Its share
 * links stay off and its plan item still ends as scheduled, so the owner picks a plan again to keep scanning it.
 * Callers check the user is an admin first.
 */
export async function restoreDeletedBusiness(businessId: string, now = new Date()): Promise<RestoreResult> {
  const db = createServiceClient();
  const { data: b, error } = await db
    .from("businesses")
    .select("deleted_at, purge_after, agencies(status)")
    .eq("id", businessId)
    .maybeSingle();
  if (error) throw new Error(`Could not load the business: ${error.message}`);
  if (!b) return { ok: false, reason: "not_found" };
  if (!b.deleted_at) return { ok: false, reason: "not_deleted" };
  if ((b.agencies as { status: string } | null)?.status === "deleted") return { ok: false, reason: "agency_deleted" };
  if (!b.purge_after || new Date(b.purge_after) <= now) return { ok: false, reason: "too_late" };

  // Guarded on the same row state, so a purge or a second restore in between changes nothing.
  const { data, error: updateError } = await db
    .from("businesses")
    .update({ deleted_at: null, purge_after: null, updated_at: now.toISOString() })
    .eq("id", businessId)
    .eq("deleted_at", b.deleted_at)
    .gt("purge_after", now.toISOString())
    .select("id")
    .maybeSingle();
  if (updateError) throw new Error(`Could not restore the business: ${updateError.message}`);
  return data ? { ok: true, deletedAt: b.deleted_at } : { ok: false, reason: "not_deleted" };
}
