import { randomUUID } from "node:crypto";
import { createServiceClient } from "@/lib/supabase/service";
import { grantCredits } from "./dal";
import { getBalance } from "./service";

// Shared set-up for the credit tests, run against the local database.
export const service = createServiceClient();
export const DAY = 24 * 60 * 60 * 1000;
export const userIds: string[] = [];

export type Agency = { agencyId: string; businessIds: string[]; email: string };

export async function createAgency(businesses = 1): Promise<Agency> {
  const email = `vitest-credits-${randomUUID()}@example.test`;
  const { data: user, error } = await service.auth.admin.createUser({ email, password: `pw-${randomUUID()}`, email_confirm: true });
  if (error || !user.user) throw error ?? new Error("no user");
  userIds.push(user.user.id);

  const { data: agency, error: agencyError } = await service
    .from("agencies")
    .insert({ owner_user_id: user.user.id, name: "Credits test", is_test: true })
    .select("id")
    .single();
  if (agencyError) throw agencyError;

  const rows = Array.from({ length: businesses }, (_, i) => ({
    owner_user_id: user.user.id,
    agency_id: agency.id,
    name: `Business ${i}`,
  }));
  const { data: made, error: businessError } = await service.from("businesses").insert(rows).select("id");
  if (businessError) throw businessError;
  return { agencyId: agency.id, businessIds: made.map((b) => b.id), email };
}

export async function newScanJob(agency: Agency, business = 0): Promise<string> {
  const { data, error } = await service
    .from("scan_jobs")
    .insert({ agency_id: agency.agencyId, business_id: agency.businessIds[business] })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

export async function balanceOf(agency: Agency) {
  return (await getBalance(agency.agencyId)).balance;
}

export async function ledgerSum(agency: Agency) {
  const { data } = await service.from("credit_transactions").select("delta").eq("agency_id", agency.agencyId);
  return data!.reduce((sum, row) => sum + row.delta, 0);
}

export function topup(agency: Agency, amount: number) {
  return grantCredits({ agencyId: agency.agencyId, source: "topup", sourceId: `cs-${randomUUID()}`, amount, expiresAt: null });
}

export async function createAdmin(): Promise<string> {
  const { data, error } = await service.auth.admin.createUser({ email: `vitest-admin-${randomUUID()}@example.test`, email_confirm: true });
  if (error || !data.user) throw error ?? new Error("no user");
  userIds.push(data.user.id);
  return data.user.id;
}

export async function deleteTestUsers() {
  for (const id of userIds.splice(0)) await service.auth.admin.deleteUser(id);
}
