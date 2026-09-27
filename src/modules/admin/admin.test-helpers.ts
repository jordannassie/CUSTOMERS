import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/service";
import type { Database } from "@/types/database.types";

// Set-up for admin tests against the local database. Test files mock @/lib/supabase/server and ADMIN_EMAILS
// from a vi.hoisted session that signInAs fills, so requireAdmin() sees a real signed-in user.
export const service = createServiceClient();
export type TestSession = { client: SupabaseClient<Database> | null; adminEmails: string };
const userIds: string[] = [];

export async function createUser(prefix: string) {
  const email = `vitest-${prefix}-${randomUUID()}@example.test`;
  const password = `pw-${randomUUID()}`;
  const { data, error } = await service.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) throw error ?? new Error("no user");
  userIds.push(data.user.id);
  return { id: data.user.id, email, password };
}

/** Signs in a new user; with admin, their email is the only one in ADMIN_EMAILS. */
export async function signInAs(session: TestSession, prefix: string, { admin }: { admin: boolean }) {
  const user = await createUser(prefix);
  const client = createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  });
  const { error } = await client.auth.signInWithPassword({ email: user.email, password: user.password });
  if (error) throw error;
  session.client = client;
  session.adminEmails = admin ? user.email : "";
  return user;
}

/** An is_test agency owned by a new user, with one business. */
export async function createAgencyWithBusiness(name: string) {
  const owner = await createUser("agency");
  const { data: agency, error } = await service
    .from("agencies")
    .insert({ owner_user_id: owner.id, name, is_test: true, status: "active" })
    .select("id")
    .single();
  if (error) throw error;
  const { data: business, error: businessError } = await service
    .from("businesses")
    .insert({
      owner_user_id: owner.id,
      agency_id: agency.id,
      name: `${name} Coffee`,
      domain: "coffee.example",
      primary_city: `Testville ${randomUUID().slice(0, 8)}`,
      primary_region: "CA",
      primary_country: "United States",
      models: ["openai", "anthropic", "perplexity"],
    })
    .select("id")
    .single();
  if (businessError) throw businessError;
  return { ownerId: owner.id, agencyId: agency.id, businessId: business.id };
}

export async function deleteTestUsers() {
  for (const id of userIds.splice(0)) await service.auth.admin.deleteUser(id);
}
