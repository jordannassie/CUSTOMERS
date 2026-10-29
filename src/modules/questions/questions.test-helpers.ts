import { randomUUID } from "node:crypto";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/service";

// Local database set-up for the question tests: an agency, a business with suggested questions, its owner signed in.
export const service = createServiceClient();
const userIds: string[] = [];

export async function deleteTestUsers() {
  for (const id of userIds.splice(0)) await service.auth.admin.deleteUser(id);
}

export const anonClient = () =>
  createSupabaseClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });

export async function createOwner(questions: number) {
  const email = `vitest-questions-${randomUUID()}@example.test`;
  const password = `pw-${randomUUID()}`;
  const { data, error } = await service.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) throw error ?? new Error("no user");
  userIds.push(data.user.id);
  const { data: agency } = await service
    .from("agencies")
    .insert({ owner_user_id: data.user.id, name: "Questions test", is_test: true, status: "active" })
    .select("id")
    .single()
    .throwOnError();
  const { data: business } = await service
    .from("businesses")
    .insert({ owner_user_id: data.user.id, agency_id: agency.id, name: "Bean There", status: "active", models: ["openai", "anthropic"] })
    .select("id")
    .single()
    .throwOnError();
  const rows = [];
  for (let i = 0; i < questions; i++) {
    const { data: row } = await service
      .from("tracked_prompts")
      .insert({ business_id: business.id, prompt: `Question ${i + 1} in Orange?`, source: "library", created_at: new Date(Date.now() - (questions - i) * 1000).toISOString() })
      .select("id")
      .single()
      .throwOnError();
    rows.push(row);
  }
  const client = anonClient();
  const signIn = await client.auth.signInWithPassword({ email, password });
  if (signIn.error) throw signIn.error;
  return { agencyId: agency.id, businessId: business.id, questionIds: rows.map((r) => r.id), client };
}

export const activeCount = async (businessId: string) =>
  (await service.from("tracked_prompts").select("id", { count: "exact", head: true }).eq("business_id", businessId).eq("active", true)).count;
