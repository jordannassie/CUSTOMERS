import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { env } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/service";

// SEC-10 (migration 047): with the public key, a signed-in user reads their own rows but writes none of them. Writes
// go through server code that checks ownership and plan limits.
const service = createServiceClient();
const users: string[] = [];
let mine: { agencyId: string; businessId: string; client: SupabaseClient; userId: string };
let other: { agencyId: string; businessId: string };

async function owner() {
  const email = `vitest-sec-${randomUUID()}@example.test`;
  const password = `pw-${randomUUID()}`;
  const { data: u } = await service.auth.admin.createUser({ email, password, email_confirm: true });
  users.push(u.user!.id);
  const { data: a } = await service.from("agencies").insert({ owner_user_id: u.user!.id, name: "Sec", is_test: true, status: "trialing" }).select("id").single().throwOnError();
  const { data: b } = await service
    .from("businesses")
    .insert({ owner_user_id: u.user!.id, agency_id: a.id, name: "Sec Biz", status: "active" })
    .select("id")
    .single()
    .throwOnError();
  await service.from("tracked_prompts").insert({ business_id: b.id, prompt: "Best plumber in Austin?", source: "library" }).throwOnError();
  const client = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  const signIn = await client.auth.signInWithPassword({ email, password });
  if (signIn.error) throw signIn.error;
  return { agencyId: a.id, businessId: b.id, client, userId: u.user!.id };
}

beforeAll(async () => {
  mine = await owner();
  other = await owner();
});
afterAll(async () => {
  for (const id of users) await service.auth.admin.deleteUser(id);
});

const denied = { code: "42501" };

describe("owner tables are read only to users (SEC-10)", () => {
  it("still reads its own business and questions", async () => {
    const { data: biz } = await mine.client.from("businesses").select("id").eq("id", mine.businessId);
    const { data: questions } = await mine.client.from("tracked_prompts").select("id").eq("business_id", mine.businessId);
    expect(biz).toHaveLength(1);
    expect(questions).toHaveLength(1);
  });

  it("can't add a business, move one to another agency, or change its settings", async () => {
    const c = mine.client;
    expect((await c.from("businesses").insert({ owner_user_id: mine.userId, agency_id: mine.agencyId, name: "Extra" })).error).toMatchObject(denied);
    expect((await c.from("businesses").update({ agency_id: other.agencyId }).eq("id", mine.businessId)).error).toMatchObject(denied);
    expect((await c.from("businesses").update({ status: "active", scan_frequency: "daily" }).eq("id", mine.businessId)).error).toMatchObject(denied);
    expect((await c.from("businesses").delete().eq("id", mine.businessId)).error).toMatchObject(denied);
    const { data } = await service.from("businesses").select("agency_id").eq("id", mine.businessId).single().throwOnError();
    expect(data.agency_id).toBe(mine.agencyId);
  });

  it("can't write questions, competitors, opportunities or scan results", async () => {
    const c = mine.client;
    const id = mine.businessId;
    expect((await c.from("tracked_prompts").insert({ business_id: id, prompt: "Extra question?" })).error).toMatchObject(denied);
    expect((await c.from("business_competitors").insert({ business_id: id, name: "Rival" })).error).toMatchObject(denied);
    expect((await c.from("opportunities").delete().eq("business_id", id)).error).toMatchObject(denied);
    expect((await c.from("visibility_runs").insert({ business_id: id, provider: "scan", status: "completed" })).error).toMatchObject(denied);
    expect((await c.from("visibility_results").insert({ business_id: id, provider: "openai", business_mentioned: true })).error).toMatchObject(denied);
  });
});
