import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { listPlanPrices } from "../dal";
import type { ChoosePlanRows } from "./service";

// Reads for the Choose plan page (BUG-079), as the service role. Callers pass the agency from requireAgency(), so
// every query is scoped to it.

export async function loadChoosePlanAgency(agencyId: string): Promise<ChoosePlanRows["agency"]> {
  const { data, error } = await createServiceClient()
    .from("agencies")
    .select("status, stripe_customer_id, stripe_subscription_id")
    .eq("id", agencyId)
    .single();
  if (error) throw new Error(`Could not load agency: ${error.message}`);
  return { status: data.status, customerId: data.stripe_customer_id, subscriptionId: data.stripe_subscription_id };
}

export async function loadChoosePlanRows(agencyId: string): Promise<ChoosePlanRows> {
  const db = createServiceClient();
  const [agency, businesses, plans] = await Promise.all([
    loadChoosePlanAgency(agencyId),
    db
      .from("businesses")
      .select("id, name")
      .eq("agency_id", agencyId)
      .neq("status", "onboarding")
      .is("deleted_at", null)
      .order("created_at"),
    listPlanPrices(db),
  ]);
  if (businesses.error) throw new Error(`Could not load businesses: ${businesses.error.message}`);
  return { agency, businesses: businesses.data, plans };
}
