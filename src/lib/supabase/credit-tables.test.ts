import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { env } from "@/lib/env";
import type { Database } from "@/types/database.types";
import { createServiceClient } from "./service";

// B-12: RLS, unique source keys and the balance view on the credit tables, against the local database.
const service = createServiceClient();
const password = `pw-${randomUUID()}`;
const DAY = 24 * 60 * 60 * 1000;

type Account = { email: string; userId: string; agencyId: string; businessId: string };

async function createAccount(label: string): Promise<Account> {
  const email = `vitest-credit-${label}-${randomUUID()}@example.test`;
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

  return { email, userId, agencyId: agency.id, businessId: business.id };
}

function anonClient() {
  return createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  });
}

describe("credit tables (B-12)", () => {
  let a: Account;
  let b: Account;
  let holdId: string;
  const asA = anonClient();

  beforeAll(async () => {
    a = await createAccount("a");
    b = await createAccount("b");

    const future = new Date(Date.now() + 30 * DAY).toISOString();
    const past = new Date(Date.now() - DAY).toISOString();
    const { error: grantError } = await service.from("credit_grants").insert([
      { agency_id: a.agencyId, source: "plan", source_id: `inv-${randomUUID()}`, amount: 100, remaining: 100, expires_at: future },
      { agency_id: a.agencyId, source: "topup", source_id: `cs-${randomUUID()}`, amount: 50, remaining: 50 },
      { agency_id: a.agencyId, source: "plan", source_id: `inv-${randomUUID()}`, amount: 30, remaining: 30, expires_at: past },
      { agency_id: b.agencyId, source: "plan", source_id: `inv-${randomUUID()}`, amount: 999, remaining: 999, expires_at: future },
    ]);
    if (grantError) throw grantError;

    const { data: job, error: jobError } = await service
      .from("scan_jobs")
      .insert({ business_id: a.businessId, agency_id: a.agencyId })
      .select("id")
      .single();
    if (jobError) throw jobError;

    const { data: hold, error: holdError } = await service
      .from("credit_holds")
      .insert({ agency_id: a.agencyId, scan_job_id: job.id, amount: 20, captured: 5 })
      .select("id")
      .single();
    if (holdError) throw holdError;
    holdId = hold.id;

    const { error: txError } = await service.from("credit_transactions").insert([
      { agency_id: a.agencyId, delta: 100, kind: "grant", source_type: "stripe_invoice_line", source_id: `il-${randomUUID()}` },
      { agency_id: b.agencyId, delta: 999, kind: "grant", source_type: "stripe_invoice_line", source_id: `il-${randomUUID()}` },
    ]);
    if (txError) throw txError;

    const { error } = await asA.auth.signInWithPassword({ email: a.email, password });
    if (error) throw error;
  });

  afterAll(async () => {
    for (const account of [a, b]) {
      if (account) await service.auth.admin.deleteUser(account.userId);
    }
  });

  it("lets a user read only their own agency's credit rows", async () => {
    for (const table of ["credit_grants", "credit_holds", "credit_transactions"] as const) {
      const { data, error } = await asA.from(table).select("agency_id");
      expect(error, table).toBeNull();
      expect(data!.length, table).toBeGreaterThan(0);
      expect(new Set(data!.map((row) => row.agency_id)), table).toEqual(new Set([a.agencyId]));
    }
  });

  it("blocks writes to credit tables with a normal user token", async () => {
    const grant = { agency_id: a.agencyId, source: "promo", source_id: randomUUID(), amount: 10, remaining: 10 };
    const tx = { agency_id: a.agencyId, delta: 10, kind: "grant", source_type: "promo", source_id: randomUUID() };
    const hold = { agency_id: a.agencyId, amount: 10 };

    expect((await asA.from("credit_grants").insert(grant)).error?.code).toBe("42501");
    expect((await asA.from("credit_transactions").insert(tx)).error?.code).toBe("42501");
    expect((await asA.from("credit_holds").insert(hold)).error?.code).toBe("42501");

    expect((await asA.from("credit_grants").update({ remaining: 9999 }).eq("agency_id", a.agencyId)).error?.code).toBe("42501");
    expect((await asA.from("credit_holds").update({ released: 15 }).eq("id", holdId)).error?.code).toBe("42501");
    expect((await asA.from("credit_transactions").delete().eq("agency_id", a.agencyId)).error?.code).toBe("42501");
  });

  it("blocks visitors from credit rows and the balance view", async () => {
    const visitor = anonClient();
    for (const table of ["credit_grants", "credit_holds", "credit_transactions"] as const) {
      const { error } = await visitor.from(table).select("agency_id").limit(1);
      expect(error?.code, table).toBe("42501");
    }
    const { error } = await visitor.from("agency_credit_balance").select("agency_id").limit(1);
    expect(error?.code).toBe("42501");
  });

  it("shows the balance as unexpired remaining minus open holds, split plan and top-up", async () => {
    const { data, error } = await asA.from("agency_credit_balance")
      .select("agency_id, plan_remaining, topup_remaining, held, balance");
    expect(error).toBeNull();
    // 100 plan + 50 top-up (the expired 30 is ignored) minus 15 still held (20 held, 5 captured).
    expect(data).toEqual([{ agency_id: a.agencyId, plan_remaining: 100, topup_remaining: 50, held: 15, balance: 135 }]);
  });

  it("rejects a repeated source key, grant source or scan job hold", async () => {
    const sourceId = `il-${randomUUID()}`;
    const tx = { agency_id: a.agencyId, delta: 5, kind: "grant", source_type: "stripe_invoice_line", source_id: sourceId };
    expect((await service.from("credit_transactions").insert(tx)).error).toBeNull();
    expect((await service.from("credit_transactions").insert(tx)).error?.code).toBe("23505");

    const grant = { agency_id: a.agencyId, source: "topup", source_id: sourceId, amount: 5, remaining: 5 };
    expect((await service.from("credit_grants").insert(grant)).error).toBeNull();
    expect((await service.from("credit_grants").insert(grant)).error?.code).toBe("23505");

    const { data: hold } = await service.from("credit_holds").select("scan_job_id").eq("id", holdId).single();
    const second = await service.from("credit_holds").insert({ agency_id: a.agencyId, scan_job_id: hold!.scan_job_id, amount: 1 });
    expect(second.error?.code).toBe("23505");
  });

  it("rejects impossible amounts", async () => {
    const overspent = { agency_id: a.agencyId, source: "promo", source_id: randomUUID(), amount: 5, remaining: 6 };
    expect((await service.from("credit_grants").insert(overspent)).error?.code).toBe("23514");

    const overCaptured = { agency_id: a.agencyId, amount: 5, captured: 4, released: 2 };
    expect((await service.from("credit_holds").insert(overCaptured)).error?.code).toBe("23514");
  });
});
