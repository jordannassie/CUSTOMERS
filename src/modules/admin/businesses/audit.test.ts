import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { env } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/service";
import type { Database } from "@/types/database.types";

// Admin audit 2026-11-12 against the local database `npm test` rebuilds, signed in as a real admin: the paused tab,
// a page past the end, Run scan now refused while paused, and the Latest answers of the newest finished scan.
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

const { listBusinesses } = await import("./list/dal");
const { loadBusinessDetail } = await import("./detail/dal");
const { runScanNow } = await import("./actions");

const service = createServiceClient();
const password = `pw-${randomUUID()}`;
const adminEmail = `vitest-admin-audit-${randomUUID()}@example.test`;
const ownerEmail = `vitest-owner-audit-${randomUUID()}@example.test`;
const userIds: string[] = [];
let agencyId: string;
let businessId: string;

async function createUser(email: string) {
  const { data, error } = await service.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) throw error ?? new Error("no user");
  userIds.push(data.user.id);
  return data.user.id;
}

async function must<R extends { data: unknown; error: { message: string } | null }>(query: PromiseLike<R>): Promise<NonNullable<R["data"]>> {
  const { data, error } = await query;
  if (error || data === null) throw new Error(error?.message ?? "no data");
  return data as NonNullable<R["data"]>;
}

beforeAll(async () => {
  await createUser(adminEmail);
  const ownerId = await createUser(ownerEmail);
  current = createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  const { error } = await current.auth.signInWithPassword({ email: adminEmail, password });
  if (error) throw error;
  adminEnv.emails = adminEmail;
  agencyId = (await must(service.from("agencies").insert({ owner_user_id: ownerId, name: "Admin audit agency", is_test: true }).select("id").single())).id;
  businessId = (
    await must(
      service
        .from("businesses")
        .insert({ owner_user_id: ownerId, agency_id: agencyId, name: "Paused Bakery", primary_city: "Testburg", models: ["openai"], status: "paused" })
        .select("id")
        .single(),
    )
  ).id;
  await must(service.from("tracked_prompts").insert({ business_id: businessId, prompt: "best bakery in Testburg" }).select("id"));
});

afterAll(async () => {
  for (const id of userIds) await service.auth.admin.deleteUser(id);
});

describe("admin businesses: audit fixes", () => {
  it("puts a paused business on its own tab, not Live, and shows the last page for a page past the end", async () => {
    adminEnv.emails = adminEmail;
    const list = await listBusinesses({ search: ownerEmail });
    expect(list.counts).toMatchObject({ all: 1, live: 0, paused: 1, setup: 0, deleted: 0, test: 1 });
    expect(list.rows).toMatchObject([{ id: businessId, paused: true, draft: false }]);
    expect((await listBusinesses({ search: ownerEmail, filter: "live" })).rows).toEqual([]);
    expect(await listBusinesses({ search: ownerEmail, page: 3 })).toMatchObject({ page: 1, total: 1, rows: [{ id: businessId }] });
  });

  it("will not run a scan for a paused business, and says why", async () => {
    adminEnv.emails = adminEmail;
    expect((await loadBusinessDetail(businessId))!.runScan.blocked).toBe("This business is paused, so a scan would be skipped.");
    expect(await runScanNow({ businessId, reason: "Support ticket 42" })).toEqual({
      ok: false,
      status: 409,
      error: "This business is paused, so a scan would be skipped.",
    });
    const { count } = await service.from("scan_jobs").select("id", { count: "exact", head: true }).eq("business_id", businessId);
    expect(count).toBe(0);
  });

  it("shows the newest finished scan's answers, older runs included, and which asked models failed (admin audit)", async () => {
    adminEnv.emails = adminEmail;
    // A finished run from before the job queue that saved no answers.
    await must(
      service
        .from("visibility_runs")
        .insert({ business_id: businessId, provider: "scan", status: "completed", created_at: "2026-09-20T10:00:00Z", checks_total: 4 })
        .select("id"),
    );
    const older = (await loadBusinessDetail(businessId))!;
    expect(older.results).toMatchObject({ older: true, rows: [], asked: [] });
    expect(older.scanTotal).toBe(1);
    expect(older.scans.find((s) => s.priority === null)).toMatchObject({ checks: 4 });

    // A newer finished job that asked three models: Perplexity ran out of credit, Claude saved nothing.
    const job = await must(
      service
        .from("scan_jobs")
        .insert({ agency_id: agencyId, business_id: businessId, status: "done", created_at: "2026-09-25T10:00:00Z", finished_at: "2026-09-25T10:05:00Z" })
        .select("id")
        .single(),
    );
    const run = await must(
      service
        .from("visibility_runs")
        .insert({
          business_id: businessId,
          scan_job_id: job.id,
          provider: "openai,anthropic,perplexity",
          status: "completed",
          failed_by_provider: { perplexity: { failed: 1, reason: "perplexity returned 402: credit balance too low" } },
        })
        .select("id")
        .single(),
    );
    await must(
      service
        .from("visibility_results")
        .insert({ run_id: run.id, business_id: businessId, provider: "openai", question: "best plumber in Testburg", business_mentioned: false })
        .select("id"),
    );
    const latest = (await loadBusinessDetail(businessId))!.results;
    expect(latest).toMatchObject({
      older: false,
      asked: ["openai", "anthropic", "perplexity"],
      failures: { perplexity: { failed: 1, reason: "perplexity returned 402: credit balance too low" } },
      rows: [{ question: "best plumber in Testburg", mentioned: { openai: false } }],
    });
  });
});
