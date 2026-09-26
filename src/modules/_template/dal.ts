import "server-only";
import { requireAgency } from "@/modules/auth";
import { createClient } from "@/lib/supabase/server";

// The DAL checks access itself, even when the caller already did, and returns only the fields
// the screen needs.
export async function getBusinessName(businessId: string): Promise<{ id: string; name: string } | null> {
  const { agency } = await requireAgency();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("businesses")
    .select("id, name")
    .eq("id", businessId)
    .eq("agency_id", agency.id)
    .maybeSingle();
  if (error) throw new Error(`Could not load business: ${error.message}`);
  return data;
}

export async function updateBusinessName(businessId: string, name: string): Promise<{ name: string } | null> {
  const { agency } = await requireAgency();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("businesses")
    .update({ name })
    .eq("id", businessId)
    .eq("agency_id", agency.id)
    .select("name")
    .maybeSingle();
  if (error) throw new Error(`Could not rename business: ${error.message}`);
  return data;
}
