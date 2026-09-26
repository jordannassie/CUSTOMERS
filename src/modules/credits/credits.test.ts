import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { afterAll, describe, expect, it } from "vitest";
import { env } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/service";
import type { Database } from "@/types/database.types";
import {
  adminAdjustCredits,
  captureCredit,
  expireGrants,
  grantCredits,
  holdCredits,
  InsufficientCreditsError,
  releaseHold,
} from "./dal";
import { estimateMonthlyCredits, getBalance } from "./service";

// B-13: the credit SQL functions against the local database (MVP_SPEC 4.2, D-53, D-54, D-55).
const service = createServiceClient();
const DAY = 24 * 60 * 60 * 1000;
const userIds: string[] = [];

type Agency = { agencyId: string; businessIds: string[]; email: string };

async function createAgency(businesses = 1): Promise<Agency> {
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

async function newScanJob(agency: Agency, business = 0): Promise<string> {
  const { data, error } = await service
    .from("scan_jobs")
    .insert({ agency_id: agency.agencyId, business_id: agency.businessIds[business] })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

async function balanceOf(agency: Agency) {
  return (await getBalance(agency.agencyId)).balance;
}

async function ledgerSum(agency: Agency) {
  const { data } = await service.from("credit_transactions").select("delta").eq("agency_id", agency.agencyId);
  return data!.reduce((sum, row) => sum + row.delta, 0);
}

function topup(agency: Agency, amount: number) {
  return grantCredits({ agencyId: agency.agencyId, source: "topup", sourceId: `cs-${randomUUID()}`, amount, expiresAt: null });
}

afterAll(async () => {
  for (const id of userIds) await service.auth.admin.deleteUser(id);
});

describe("credit functions (B-13)", () => {
  it("lowers the balance by exactly 36 for 12 questions on 3 models", async () => {
    const agency = await createAgency();
    await topup(agency, 100);
    const job = await newScanJob(agency);

    const hold = await holdCredits(agency.agencyId, 36, job);
    expect(await balanceOf(agency)).toBe(64);
    for (let i = 0; i < 36; i++) expect(await captureCredit(hold, randomUUID())).toBe(true);
    expect(await releaseHold(hold)).toBe(0);

    expect(await balanceOf(agency)).toBe(64);
    const { data: scan } = await service.from("scan_jobs").select("hold_id, credits_charged").eq("id", job).single();
    expect(scan).toEqual({ hold_id: hold, credits_charged: 36 });
    expect(await ledgerSum(agency)).toBe(64);
  });

  it("charges only successful checks when a provider fails, and returns the rest", async () => {
    const agency = await createAgency();
    await topup(agency, 100);
    const hold = await holdCredits(agency.agencyId, 36, await newScanJob(agency));

    // One of three providers fails every check: 24 succeed, 12 are never captured.
    for (let i = 0; i < 24; i++) await captureCredit(hold, randomUUID());
    expect(await releaseHold(hold)).toBe(12);
    expect(await balanceOf(agency)).toBe(76);

    const { data: held } = await service.from("credit_holds").select("captured, released, status").eq("id", hold).single();
    expect(held).toEqual({ captured: 24, released: 12, status: "closed" });
  });

  it("charges a retried check once", async () => {
    const agency = await createAgency();
    await topup(agency, 10);
    const hold = await holdCredits(agency.agencyId, 3, await newScanJob(agency));
    const check = randomUUID();

    expect(await captureCredit(hold, check)).toBe(true);
    expect(await captureCredit(hold, check)).toBe(false);
    const [first, second] = await Promise.all([captureCredit(hold, randomUUID()), captureCredit(hold, randomUUID())]);
    expect([first, second]).toEqual([true, true]);
    await releaseHold(hold);
    // The same check after release is still recognised, not an error.
    expect(await captureCredit(hold, check)).toBe(false);
    expect(await balanceOf(agency)).toBe(7);
  });

  it("gives a retried scan job its first hold back instead of holding twice", async () => {
    const agency = await createAgency();
    await topup(agency, 100);
    const job = await newScanJob(agency);

    const [a, b] = await Promise.all([holdCredits(agency.agencyId, 36, job), holdCredits(agency.agencyId, 36, job)]);
    expect(a).toBe(b);
    expect(await balanceOf(agency)).toBe(64);
  });

  it("lets only one of two concurrent scans start when the credits cover one", async () => {
    const agency = await createAgency(2);
    await topup(agency, 10);
    const jobs = [await newScanJob(agency, 0), await newScanJob(agency, 1)];

    const results = await Promise.allSettled(jobs.map((job) => holdCredits(agency.agencyId, 10, job)));
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const rejected = results.find((r) => r.status === "rejected") as PromiseRejectedResult;
    expect(rejected.reason).toBeInstanceOf(InsufficientCreditsError);
    expect(await balanceOf(agency)).toBe(0);
  });

  it("finishes a scan past zero, blocks the next, and a top-up pays off the overdraft first", async () => {
    const agency = await createAgency(2);
    await topup(agency, 5);

    const hold = await holdCredits(agency.agencyId, 36, await newScanJob(agency, 0));
    for (let i = 0; i < 36; i++) await captureCredit(hold, randomUUID());
    await releaseHold(hold);

    expect(await getBalance(agency.agencyId)).toMatchObject({ balance: -31, overdraft: 31 });
    expect(await ledgerSum(agency)).toBe(-31);
    await expect(holdCredits(agency.agencyId, 36, await newScanJob(agency, 1))).rejects.toBeInstanceOf(InsufficientCreditsError);

    const grantId = await topup(agency, 500);
    expect(await getBalance(agency.agencyId)).toMatchObject({ balance: 469, topup_remaining: 469, overdraft: 0 });
    expect(await ledgerSum(agency)).toBe(469);
    const { data: rows } = await service.from("credit_transactions").select("kind, delta").eq("grant_id", grantId);
    expect(rows).toEqual(expect.arrayContaining([{ kind: "overdraft_settle", delta: 31 }, { kind: "grant", delta: 469 }]));
  });

  it("blocks a scan at exactly 0", async () => {
    const agency = await createAgency();
    await expect(holdCredits(agency.agencyId, 1, await newScanJob(agency))).rejects.toBeInstanceOf(InsufficientCreditsError);
  });

  it("spends the soonest-expiring grant first and skips expired ones", async () => {
    const agency = await createAgency();
    const soon = new Date(Date.now() + DAY);
    const later = new Date(Date.now() + 20 * DAY);
    const topupId = await topup(agency, 5);
    const laterId = await grantCredits({ agencyId: agency.agencyId, source: "plan", sourceId: `il-${randomUUID()}`, amount: 5, expiresAt: later });
    const soonId = await grantCredits({ agencyId: agency.agencyId, source: "trial", sourceId: `tr-${randomUUID()}`, amount: 2, expiresAt: soon });
    // Expired but not yet zeroed by expire_grants: must never be spent.
    const { data: expired } = await service
      .from("credit_grants")
      .insert({ agency_id: agency.agencyId, source: "promo", source_id: randomUUID(), amount: 50, remaining: 50, expires_at: new Date(Date.now() - DAY).toISOString() })
      .select("id")
      .single();

    const hold = await holdCredits(agency.agencyId, 4, await newScanJob(agency));
    for (let i = 0; i < 4; i++) await captureCredit(hold, randomUUID());

    const { data: grants } = await service.from("credit_grants").select("id, remaining").eq("agency_id", agency.agencyId);
    const remaining = Object.fromEntries(grants!.map((g) => [g.id, g.remaining]));
    expect(remaining).toEqual({ [soonId]: 0, [laterId]: 3, [topupId]: 5, [expired!.id]: 50 });
    expect(await balanceOf(agency)).toBe(8);

    expect(await expireGrants()).toBeGreaterThanOrEqual(1);
    const { data: after } = await service.from("credit_grants").select("remaining").eq("id", expired!.id).single();
    expect(after!.remaining).toBe(0);
    const { data: tx } = await service.from("credit_transactions").select("kind, delta").eq("grant_id", expired!.id);
    expect(tx).toEqual([{ kind: "expire", delta: -50 }]);
    expect(await balanceOf(agency)).toBe(8);
  });

  it("applies a replayed Stripe grant once", async () => {
    const agency = await createAgency();
    const input = { agencyId: agency.agencyId, source: "plan" as const, sourceId: `il-${randomUUID()}`, amount: 1200, expiresAt: new Date(Date.now() + 30 * DAY) };
    const [a, b] = await Promise.all([grantCredits(input), grantCredits(input)]);
    expect(a).toBe(b);
    expect(await balanceOf(agency)).toBe(1200);
  });

  it("adjusts by hand in both directions, settling or creating overdraft", async () => {
    const agency = await createAgency();
    const { data: admin } = await service.auth.admin.createUser({ email: `vitest-admin-${randomUUID()}@example.test`, email_confirm: true });
    userIds.push(admin.user!.id);
    const by = { agencyId: agency.agencyId, adminUserId: admin.user!.id };

    await adminAdjustCredits({ ...by, delta: 10, note: "goodwill" });
    expect(await balanceOf(agency)).toBe(10);
    await adminAdjustCredits({ ...by, delta: -15, note: "correction" });
    expect(await getBalance(agency.agencyId)).toMatchObject({ balance: -5, overdraft: 5 });
    await adminAdjustCredits({ ...by, delta: 7, note: "refund" });
    expect(await getBalance(agency.agencyId)).toMatchObject({ balance: 2, overdraft: 0 });
    expect(await ledgerSum(agency)).toBe(2);

    const { data: rows } = await service.from("credit_transactions").select("admin_user_id, note").eq("agency_id", agency.agencyId);
    expect(rows!.every((r) => r.admin_user_id === admin.user!.id && r.note)).toBe(true);
  });

  it("cannot be called by visitors or signed-in users", async () => {
    const agency = await createAgency();
    const client = createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
    });
    const grant = { p_agency_id: agency.agencyId, p_source: "promo", p_source_id: randomUUID(), p_amount: 999 };
    expect((await client.rpc("grant_credits", grant)).error?.code).toBe("42501");

    await service.auth.admin.updateUserById(userIds.at(-1)!, { password: "pw-owner-1234" });
    await client.auth.signInWithPassword({ email: agency.email, password: "pw-owner-1234" });
    expect((await client.rpc("grant_credits", grant)).error?.code).toBe("42501");
    expect((await client.rpc("expire_grants")).error?.code).toBe("42501");
    expect((await client.rpc("credit_lock_agency", { p_agency_id: agency.agencyId })).error?.code).toBe("42501");
    expect(await balanceOf(agency)).toBe(0);
  });
});

describe("estimateMonthlyCredits (MVP_SPEC 4.3)", () => {
  it("multiplies questions, models and scans a month", () => {
    expect(estimateMonthlyCredits(12, 3, "weekly")).toBe(155);
    expect(estimateMonthlyCredits(12, 3, "daily")).toBe(1080);
    expect(estimateMonthlyCredits(12, 3, "monthly")).toBe(36);
    expect(estimateMonthlyCredits(0, 3, "daily")).toBe(0);
  });
});
