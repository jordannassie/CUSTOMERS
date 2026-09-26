import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { env } from "@/lib/env";
import type { Database } from "@/types/database.types";
import { createServiceClient } from "./service";

// B-11: RLS and job-queue rules on the core tables, against the local database `npm test` rebuilds.
const service = createServiceClient();
const password = `pw-${randomUUID()}`;

type Account = { email: string; userId: string; agencyId: string; businessId: string };

async function createAccount(label: string): Promise<Account> {
  const email = `vitest-${label}-${randomUUID()}@example.test`;
  const { data: user, error } = await service.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !user.user) throw error ?? new Error("no user");
  const userId = user.user.id;

  const { data: agency, error: agencyError } = await service
    .from("agencies")
    .insert({ owner_user_id: userId, name: `Agency ${label}`, is_test: true })
    .select("id")
    .single();
  if (agencyError) throw agencyError;

  const { data: business, error: businessError } = await service
    .from("businesses")
    .insert({ owner_user_id: userId, agency_id: agency.id, name: `Business ${label}` })
    .select("id")
    .single();
  if (businessError) throw businessError;

  const { error: subError } = await service
    .from("business_subscriptions")
    .insert({ business_id: business.id, agency_id: agency.id, plan_id: "starter" });
  if (subError) throw subError;

  return { email, userId, agencyId: agency.id, businessId: business.id };
}

function anonClient() {
  return createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  });
}

describe("core tables (B-11)", () => {
  let a: Account;
  let b: Account;
  const asA = anonClient();

  beforeAll(async () => {
    a = await createAccount("a");
    b = await createAccount("b");
    const { error } = await asA.auth.signInWithPassword({ email: a.email, password });
    if (error) throw error;
  });

  afterAll(async () => {
    for (const account of [a, b]) {
      if (account) await service.auth.admin.deleteUser(account.userId);
    }
  });

  it("lets a user read their own agency and not another agency", async () => {
    const { data, error } = await asA.from("agencies").select("id");
    expect(error).toBeNull();
    expect(data?.map((row) => row.id)).toEqual([a.agencyId]);
  });

  it("lets a user read their own agency's businesses and not another agency's", async () => {
    const { data, error } = await asA.from("businesses").select("id").in("id", [a.businessId, b.businessId]);
    expect(error).toBeNull();
    expect(data?.map((row) => row.id)).toEqual([a.businessId]);

    const { data: subs } = await asA.from("business_subscriptions").select("business_id");
    expect(subs?.map((row) => row.business_id)).toEqual([a.businessId]);
  });

  it("blocks signed-in users from service-only tables", async () => {
    for (const table of ["scan_jobs", "ai_answer_cache", "system_alerts", "admin_audit_log", "question_library"] as const) {
      const { error } = await asA.from(table).select("created_at").limit(1);
      expect(error?.code, table).toBe("42501");
    }
  });

  it("shows active plan prices to visitors", async () => {
    const { data, error } = await anonClient().from("plans").select("id, price_cents, active").order("id");
    expect(error).toBeNull();
    expect(data).toEqual([
      { id: "enterprise", price_cents: null, active: false },
      { id: "pro", price_cents: 24900, active: true },
      { id: "starter", price_cents: 14900, active: true },
    ]);
  });

  it("allows only one queued or running job per business", async () => {
    const job = { business_id: a.businessId, agency_id: a.agencyId };
    const first = await service.from("scan_jobs").insert(job).select("id").single();
    expect(first.error).toBeNull();

    const second = await service.from("scan_jobs").insert(job);
    expect(second.error?.code).toBe("23505");

    await service.from("scan_jobs").update({ status: "done" }).eq("id", first.data!.id);
    const next = await service.from("scan_jobs").insert(job);
    expect(next.error).toBeNull();
  });
});
