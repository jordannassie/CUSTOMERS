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

describe("startScan", { timeout: 30_000 }, () => {
  it("refuses signed-out callers", async () => {
    expect(await startScan({ businessId: randomUUID() })).toMatchObject({ ok: false, status: 401 });
    expect(await getScanStatus({ businessId: randomUUID() })).toMatchObject({ ok: false, status: 401 });
  });

  it("queues one high-priority job, and a double submit still creates one job", async () => {
    const { businessId } = await signedInBusiness(100);
    expect(await getScanStatus({ businessId })).toEqual({
      ok: true,
      data: { scanning: false, lastResult: null, lastFinishedAt: null, blockedReason: null },
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

  it("treats another agency's business and bad input as not found", async () => {
    const other = await signedInBusiness(100);
    await signedInBusiness(100);
    expect(await startScan({ businessId: other.businessId })).toMatchObject({ ok: false, status: 404 });
    expect(await getScanStatus({ businessId: other.businessId })).toMatchObject({ ok: false, status: 404 });
    expect(await startScan({ businessId: "not-a-uuid" })).toMatchObject({ ok: false, status: 404 });
    expect(await jobsFor(other.businessId)).toEqual([]);
  });
});
