import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/supabase/service";
import type { Database } from "@/types/database.types";

// Reads for buying credits (B-43). Callers pass the agency from requireAgency(), never one from the browser.

type Db = SupabaseClient<Database>;

/** The Stripe customer the agency is already linked to (signup trial or an earlier top-up). */
export async function agencyCustomerId(agencyId: string, db: Db = createServiceClient()): Promise<string | null> {
  const { data, error } = await db.from("agencies").select("stripe_customer_id").eq("id", agencyId).single();
  if (error) throw new Error(`agency customer read failed: ${error.message}`);
  return data.stripe_customer_id;
}

/** The credits the webhook granted for this Checkout Session, or null while it has not arrived yet. */
export async function topupGrantFor(agencyId: string, sessionId: string, db: Db = createServiceClient()): Promise<number | null> {
  const { data, error } = await db
    .from("credit_grants")
    .select("amount")
    .eq("agency_id", agencyId)
    .eq("source", "topup")
    .eq("source_id", sessionId)
    .maybeSingle();
  if (error) throw new Error(`top-up grant read failed: ${error.message}`);
  return data?.amount ?? null;
}
