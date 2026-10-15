import { randomUUID } from "node:crypto";
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { env } from "@/lib/env";
import { createTestAgency, deleteTestUsers, service } from "./jobs.test-helpers";

// B-29 against the local database. Test agencies, no WORKER_URL and no in-process worker: nothing runs a scan.
let session: SupabaseClient | null = null;

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () =>
    session ??
    createSupabaseClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } }),
}));

const { getScanStatus, startScan } = await import("./actions");

afterAll(deleteTestUsers);

beforeEach(() => {
  session = null;
});

/** A signed-in owner of a test agency with one business. */
async function signedInBusiness(credits: number) {
  const agency = await createTestAgency(credits);
  const password = `pw-${randomUUID()}`;
  const { data: user, error } = await service.auth.admin.updateUserById(agency.ownerUserId, { password });
  if (error) throw error;
  const { data: business, error: businessError } = await service
    .from("businesses")
    .insert({ owner_user_id: agency.ownerUserId, agency_id: agency.agencyId, name: "Run Scan Bakery", status: "active" })
    .select("id")
    .single();
  if (businessError) throw businessError;

  const client = createSupabaseClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  const signIn = await client.auth.signInWithPassword({ email: user.user.email!, password });
  if (signIn.error) throw signIn.error;
  session = client;
  return { ...agency, businessId: business.id };
}

async function jobsFor(businessId: string) {
  const { data, error } = await service.from("scan_jobs").select("status, priority").eq("business_id", businessId);
  if (error) throw error;
  return data;
}

describe("startScan", () => {
  it("refuses signed-out callers", async () => {
    expect(await startScan({ businessId: randomUUID() })).toMatchObject({ ok: false, status: 401 });
    expect(await getScanStatus({ businessId: randomUUID() })).toMatchObject({ ok: false, status: 401 });
  });

  it("queues one high-priority job, and a double submit still creates one job", async () => {
    const { businessId } = await signedInBusiness(100);
    expect(await getScanStatus({ businessId })).toEqual({
      ok: true,
      data: { scanning: false, retrying: false, stalled: false, lastResult: null, lastFinishedAt: null, blockedReason: null, failedReason: null },
    });

    const results = await Promise.all([startScan({ businessId }), startScan({ businessId })]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(results.find((r) => !r.ok)).toEqual({
      ok: false,
      status: 409,
      error: "A scan is already running. You can start another when it finishes.",
    });
    expect(await jobsFor(businessId)).toEqual([{ status: "queued", priority: 100 }]);
    expect(await getScanStatus({ businessId })).toMatchObject({ ok: true, data: { scanning: true } });

    // Pressing again later, after the page has loaded.
    expect(await startScan({ businessId })).toMatchObject({ ok: false, status: 409 });
    expect(await jobsFor(businessId)).toHaveLength(1);
  });

  it("explains 0 credits and queues nothing", async () => {
    const { businessId } = await signedInBusiness(0);
    expect(await startScan({ businessId })).toEqual({
      ok: false,
      status: 403,
      error: "You're out of credits. Buy a top-up or upgrade.",
    });
    expect(await getScanStatus({ businessId })).toMatchObject({
      ok: true,
      data: { scanning: false, blockedReason: "You're out of credits. Buy a top-up or upgrade." },
    });
    expect(await jobsFor(businessId)).toEqual([]);
  });

  it("asks before a scan that costs more than the balance, and queues it once confirmed (D-54)", async () => {
    const { businessId } = await signedInBusiness(5);
    // 3 questions on the default 3 models: 9 credits against 5.
    const prompts = ["One?", "Two?", "Three?"].map((prompt) => ({ business_id: businessId, prompt }));
    const inserted = await service.from("tracked_prompts").insert(prompts);
    if (inserted.error) throw inserted.error;

    expect(await startScan({ businessId })).toEqual({
      ok: false,
      status: 402,
      error: "This scan uses 9 credits and you have 5. It will still finish, and the 4 extra credits come out of your next renewal or top-up.",
      overdraft: { cost: 9, balance: 5 },
    });
    expect(await jobsFor(businessId)).toEqual([]);

    expect(await startScan({ businessId, confirmOverdraft: true })).toMatchObject({ ok: true, data: { scanning: true } });
    expect(await jobsFor(businessId)).toEqual([{ status: "queued", priority: 100 }]);
  });

  it("asks before scanning again within 24 hours of the last scan, and queues once confirmed (2026-10-15)", async () => {
    const { agencyId, businessId } = await signedInBusiness(100);
    const prompts = ["One?", "Two?"].map((prompt) => ({ business_id: businessId, prompt }));
    await service.from("tracked_prompts").insert(prompts).throwOnError();
    const finished = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
    await service.from("scan_jobs").insert({ agency_id: agencyId, business_id: businessId, status: "done", finished_at: finished }).throwOnError();

    expect(await startScan({ businessId })).toEqual({
      ok: false,
      status: 428,
      error: "You scanned today. Most answers will be the same as the last scan and still use 6 credits.",
      recentScan: { cost: 6 },
    });
    expect(await jobsFor(businessId)).toEqual([{ status: "done", priority: 0 }]);

    expect(await startScan({ businessId, confirmRecent: true })).toMatchObject({ ok: true, data: { scanning: true } });
    expect((await jobsFor(businessId)).filter((j) => j.status === "queued")).toHaveLength(1);
  });

  it("does not ask when the last scan finished more than 24 hours ago", async () => {
    const { agencyId, businessId } = await signedInBusiness(100);
    const finished = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
    await service.from("scan_jobs").insert({ agency_id: agencyId, business_id: businessId, status: "done", finished_at: finished }).throwOnError();
    expect(await startScan({ businessId })).toMatchObject({ ok: true });
  });

  it("treats another agency's business and bad input as not found", async () => {
    const other = await signedInBusiness(100);
    await signedInBusiness(100);
    expect(await startScan({ businessId: other.businessId })).toMatchObject({ ok: false, status: 404 });
    expect(await getScanStatus({ businessId: other.businessId })).toMatchObject({ ok: false, status: 404 });
    expect(await startScan({ businessId: "not-a-uuid" })).toMatchObject({ ok: false, status: 404 });
    expect(await jobsFor(other.businessId)).toEqual([]);
  });
});
