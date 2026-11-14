import "server-only";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * The agency owner's email, to spot an agency "name" that is only its start (reportAgencyName, QA round 2); null when
 * unknown. Callers have already checked the agency is the user's, or are server jobs.
 */
export async function agencyOwnerEmail(ownerUserId: string | null): Promise<string | null> {
  if (!ownerUserId) return null;
  const { data, error } = await createServiceClient().from("profiles").select("email").eq("id", ownerUserId).maybeSingle();
  if (error) throw new Error(`Reports: could not read the agency owner: ${error.message}`);
  return data?.email ?? null;
}
