import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { env } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/service";
import { captureCredit, grantCredits, holdCredits } from "@/modules/credits";
import type { Database } from "@/types/database.types";

// Runs against the local database `npm test` rebuilds, signed in as a real test user.
let current: SupabaseClient<Database>;
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => current }));
vi.mock("next/cache", () => ({ refresh: vi.fn() }));
const adminEnv = vi.hoisted(() => ({ emails: "" }));
vi.mock("@/lib/env", async (importOriginal) => {
  const { env } = await importOriginal<typeof import("@/lib/env")>();
  return {
    env: new Proxy(env, {
      get: (target, key) => (key === "ADMIN_EMAILS" ? adminEnv.emails : Reflect.get(target, key)),
    }),
  };
});

const { listBusinesses } = await import("./dal");
const { loadBusinessDetail } = await import("./detail/dal");
const { runScanNow } = await import("./actions");

const service = createServiceClient();
const password = `pw-${randomUUID()}`;
const adminEmail = `vitest-admin-biz-${randomUUID()}@example.test`;
const ownerEmail = `vitest-owner-biz-${randomUUID()}@example.test`;
const userIds: string[] = [];
let agencyId: string;
let businessId: string;

async function createUser(email: string) {
  const { data, error } = await service.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) throw error ?? new Error("no user");
  userIds.push(data.user.id);
  return data.user.id;
}

async function must<R extends { data: unknown; error: { message: string } | null }>(
  query: PromiseLike<R>,
): Promise<NonNullable<R["data"]>> {
  const { data, error } = await query;
  if (error || data === null) throw new Error(error?.message ?? "no data");
  return data as NonNullable<R["data"]>;
}

beforeAll(async () => {
  await createUser(adminEmail);
  const ownerId = await createUser(ownerEmail);
  current = createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  });
  const { error } = await current.auth.signInWithPassword({ email: adminEmail, password });
  if (error) throw error;

  agencyId = (
    await must(
      service
        .from("agencies")
        .insert({ owner_user_id: ownerId, name: "Admin test agency", is_test: true })
        .select("id")
        .single(),
    )
  ).id;
  businessId = (
    await must(
      service
        .from("businesses")
        .insert({
          owner_user_id: ownerId,
          agency_id: agencyId,
          name: "Admin Test Plumbing",
          primary_city: "Testburg",
          models: ["openai", "anthropic"],
        })
        .select("id")
        .single(),
    )
  ).id;
  await must(
    service
      .from("tracked_prompts")
      .insert({ business_id: businessId, prompt: "best plumber in Testburg" })
      .select("id"),
  );
  await grantCredits({ agencyId, source: "topup", sourceId: `cs-${randomUUID()}`, amount: 50, expiresAt: null });

  // One finished scan: two checks, one naming the business, both charged.
  const job = await must(
    service
      .from("scan_jobs")
      .insert({ agency_id: agencyId, business_id: businessId, status: "running" })
      .select("id")
      .single(),
  );
  const holdId = await holdCredits(agencyId, 2, job.id);
  const run = await must(
    service
      .from("visibility_runs")
      .insert({
        business_id: businessId,
        provider: "multi",
        status: "completed",
        scan_job_id: job.id,
        checks_total: 2,
        checks_failed: 0,
      })
      .select("id")
      .single(),
  );
  const results = await must(
    service
      .from("visibility_results")
      .insert([
        {
          run_id: run.id,
          business_id: businessId,
          provider: "openai",
          question: "best plumber in Testburg",
          business_mentioned: true,
        },
        {
          run_id: run.id,
          business_id: businessId,
          provider: "anthropic",
          question: "best plumber in Testburg",
          business_mentioned: false,
        },
      ])
      .select("id"),
  );
  for (const r of results) await captureCredit(holdId, r.id);
  await must(
    service
      .from("scan_jobs")
      .update({ status: "done", finished_at: new Date().toISOString() })
      .eq("id", job.id)
      .select("id"),
  );
});

afterAll(async () => {
  for (const id of userIds) await service.auth.admin.deleteUser(id);
});

describe("admin businesses (B-66)", () => {
  it("lists the business with its agency, models, last scan and credits this month", async () => {
    const row = (await listBusinesses()).find((b) => b.id === businessId);
    expect(row).toMatchObject({
      name: "Admin Test Plumbing",
      agency: { name: "Admin test agency", ownerEmail, isTest: true },
      plan: null,
      frequency: "weekly",
      models: ["openai", "anthropic"],
      lastScan: { state: "done" },
      creditsThisMonth: 2,
    });
  });

  it("shows one business with its answers, scan history and credits", async () => {
    const detail = await loadBusinessDetail(businessId);
    expect(detail).toMatchObject({
      ownerEmail,
      questions: [{ prompt: "best plumber in Testburg", active: true }],
      credits: { thisMonth: 2, allTime: 2 },
      activeScan: false,
      results: { rows: [{ question: "best plumber in Testburg", mentioned: { openai: true, anthropic: false } }] },
    });
    expect(detail!.scans[0]).toMatchObject({ state: "done", checks: 2, checksFailed: 0, credits: 2 });
    expect(await loadBusinessDetail(randomUUID())).toBeNull();
  });

  it("refuses a non-admin and queues nothing", async () => {
    adminEnv.emails = "someone-else@example.test";
    expect(await runScanNow({ businessId })).toMatchObject({ ok: false, status: 403 });
    const { count } = await service
      .from("scan_jobs")
      .select("id", { count: "exact", head: true })
      .eq("business_id", businessId)
      .eq("status", "queued");
    expect(count).toBe(0);
  });

  it("queues one high-priority scan, logs it, and refuses a second while it is active", async () => {
    adminEnv.emails = adminEmail;
    expect(await runScanNow({ businessId: "not-a-uuid" })).toMatchObject({ ok: false, status: 400 });

    const first = await runScanNow({ businessId });
    expect(first.ok).toBe(true);
    const jobId = first.ok ? first.data.jobId : "";
    const job = await must(service.from("scan_jobs").select("status, priority, agency_id").eq("id", jobId).single());
    expect(job).toEqual({ status: "queued", priority: 101, agency_id: agencyId });

    const log = await must(
      service.from("admin_audit_log").select("action, target_type, details").eq("target_id", businessId),
    );
    expect(log).toEqual([{ action: "business.run_scan", target_type: "business", details: { job_id: jobId } }]);

    expect(await runScanNow({ businessId })).toMatchObject({ ok: false, status: 409 });
    const { count } = await service
      .from("scan_jobs")
      .select("id", { count: "exact", head: true })
      .eq("business_id", businessId)
      .eq("status", "queued");
    expect(count).toBe(1);
    expect((await loadBusinessDetail(businessId))!.activeScan).toBe(true);
  });

  it("shows a deleted business as deleted and refuses to scan it or a deleted account's (BUG-G, BUG-H)", async () => {
    adminEnv.emails = adminEmail;
    const deletedId = (
      await must(
        service
          .from("businesses")
          .insert({
            owner_user_id: userIds[1],
            agency_id: agencyId,
            name: "Deleted Plumbing",
            deleted_at: "2026-10-01T12:00:00Z",
            purge_after: "2026-10-31T12:00:00Z",
          })
          .select("id")
          .single(),
      )
    ).id;
    expect(await runScanNow({ businessId: deletedId })).toEqual({
      ok: false,
      status: 409,
      error: "This business was deleted, so it can't be scanned.",
    });
    const rows = await listBusinesses();
    expect(rows.find((r) => r.id === deletedId)?.deleted).toEqual({
      at: expect.stringMatching(/^2026-10-01T12:00:00/),
      purgeAfter: expect.stringMatching(/^2026-10-31T12:00:00/),
    });
    expect(rows.find((r) => r.id === businessId)?.deleted).toBeNull();
    expect((await loadBusinessDetail(deletedId))!.business.purge_after).toMatch(/^2026-10-31/);

    const ownerId = await createUser(`vitest-owner-biz-${randomUUID()}@example.test`);
    const goneAgency = (
      await must(
        service
          .from("agencies")
          .insert({ owner_user_id: ownerId, name: "Deleted agency", is_test: true, status: "deleted" })
          .select("id")
          .single(),
      )
    ).id;
    const liveId = (
      await must(
        service
          .from("businesses")
          .insert({ owner_user_id: ownerId, agency_id: goneAgency, name: "Orphan Plumbing" })
          .select("id")
          .single(),
      )
    ).id;
    expect(await runScanNow({ businessId: liveId })).toMatchObject({ ok: false, status: 409 });

    const { count } = await service
      .from("scan_jobs")
      .select("id", { count: "exact", head: true })
      .in("business_id", [deletedId, liveId]);
    expect(count).toBe(0);
  });

  it("says a missing business was not found", async () => {
    adminEnv.emails = adminEmail;
    expect(await runScanNow({ businessId: randomUUID() })).toMatchObject({ ok: false, status: 404 });
  });
});
