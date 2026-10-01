import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { env } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/service";
import type { Database } from "@/types/database.types";

// BUG-G and BUG-H against the local database `npm test` rebuilds, signed in as a real admin.
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
const adminEmail = `vitest-admin-del-${randomUUID()}@example.test`;
const ownerEmail = `vitest-owner-del-${randomUUID()}@example.test`;
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
      service.from("agencies").insert({ owner_user_id: ownerId, name: "Admin delete test agency", is_test: true }).select("id").single(),
    )
  ).id;
  businessId = (
    await must(
      service.from("businesses").insert({ owner_user_id: ownerId, agency_id: agencyId, name: "Live Plumbing" }).select("id").single(),
    )
  ).id;
});

afterAll(async () => {
  for (const id of userIds) await service.auth.admin.deleteUser(id);
});

describe("admin businesses: deleted ones", () => {
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
});
