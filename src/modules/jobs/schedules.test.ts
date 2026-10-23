import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { afterAll, describe, expect, it } from "vitest";
import { env } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/service";
import { grantCredits } from "@/modules/credits";

// B-28 schedules (migrations 029 to 031) against the local database. No AI calls: nothing here runs a scan.
const service = createServiceClient();
const userIds: string[] = [];
const DAY_MS = 86_400_000;
const inDays = (days: number) => new Date(Date.now() + days * DAY_MS).toISOString();
const endOfTodayUtc = () => new Date(Math.floor(Date.now() / DAY_MS) * DAY_MS + DAY_MS - 60_000).toISOString();

afterAll(async () => {
  for (const id of userIds.splice(0)) await service.auth.admin.deleteUser(id);
});

async function agency(opts: { isTest?: boolean; status?: string; credits?: number } = {}) {
  const { data: user, error } = await service.auth.admin.createUser({
    email: `vitest-schedules-${randomUUID()}@example.test`,
    email_confirm: true,
  });
  if (error || !user.user) throw error ?? new Error("no user");
  userIds.push(user.user.id);
  const { data } = await service
    .from("agencies")
    .insert({ owner_user_id: user.user.id, name: "Schedules test", is_test: opts.isTest ?? true, status: opts.status ?? "active" })
    .select("id")
    .single()
    .throwOnError();
  if ((opts.credits ?? 100) > 0) {
    await grantCredits({ agencyId: data.id, source: "topup", sourceId: `cs-${randomUUID()}`, amount: opts.credits ?? 100, expiresAt: null });
  }
  return { agencyId: data.id, ownerUserId: user.user.id };
}

async function business(owner: { agencyId: string; ownerUserId: string }, fields: Record<string, unknown> = {}) {
  const { data } = await service
    .from("businesses")
    .insert({ owner_user_id: owner.ownerUserId, agency_id: owner.agencyId, name: "Bean There Coffee", status: "active", ...fields })
    .select("id")
    .single()
    .throwOnError();
  return data.id;
}

async function jobsFor(businessIds: string[]) {
  const { data } = await service.from("scan_jobs").select("business_id, status, priority").in("business_id", businessIds).throwOnError();
  return data;
}

describe("enqueue_due_scans", () => {
  it("queues due test businesses with credits in good standing, once each, and never real agencies before go-live", async () => {
    const good = await agency();
    const due = await business(good, { next_scan_at: inDays(-2) });
    const dueLaterToday = await business(good, { next_scan_at: endOfTodayUtc() });
    const notDue = await business(good, { next_scan_at: inDays(2) });
    const neverScheduled = await business(good);
    const paused = await business(good, { next_scan_at: inDays(-1), status: "paused" });
    const noCredits = await business(await agency({ credits: 0 }), { next_scan_at: inDays(-1) });
    const pastDue = await business(await agency({ status: "past_due" }), { next_scan_at: inDays(-1) });
    const real = await business(await agency({ isTest: false }), { next_scan_at: inDays(-1) });
    const all = [due, dueLaterToday, notDue, neverScheduled, paused, noCredits, pastDue, real];

    await service.rpc("enqueue_due_scans", { p_include_real: false }).throwOnError();
    const queued = await jobsFor(all);
    expect(queued.map((j) => j.business_id).sort()).toEqual([due, dueLaterToday].sort());
    expect(queued.every((j) => j.status === "queued" && j.priority === 0)).toBe(true);

    await service.rpc("enqueue_due_scans", { p_include_real: false }).throwOnError();
    expect(await jobsFor(all)).toHaveLength(2);

    // The go-live switch (B-80).
    await service.rpc("enqueue_due_scans", { p_include_real: true }).throwOnError();
    expect((await jobsFor(all)).map((j) => j.business_id).sort()).toEqual([due, dueLaterToday, real].sort());
  });

  it("cannot be called by signed-in users or anon", async () => {
    const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
    for (const fn of ["enqueue_due_scans", "call_scan_worker", "cron_job_status"] as const) {
      const { error } = await anon.rpc(fn);
      expect(error?.code).toBe("42501");
    }
  });
});

describe("call_scan_worker", () => {
  it("sends nothing while the worker URL and secret are not in Vault", async () => {
    const { data } = await service.rpc("call_scan_worker").throwOnError();
    expect(data).toBeNull();
  });
});

describe("cron_job_status", () => {
  it("lists the scan schedules", async () => {
    const { data } = await service.rpc("cron_job_status").throwOnError();
    expect(data.map((j) => [j.job_name, j.schedule, j.active])).toEqual(
      expect.arrayContaining([
        ["call-scan-worker", "* * * * *", true],
        ["enqueue-due-scans", "0 2 * * *", true],
        ["expire-grants", "0 1 * * *", true],
        ["reset-stuck-jobs", "*/10 * * * *", true],
      ]),
    );
  });
});

describe("changing the scan frequency", () => {
  it("moves the next scan to last scan plus the new frequency", async () => {
    const owner = await agency();
    const next = new Date(Date.now() + 5 * DAY_MS);
    const id = await business(owner, { scan_frequency: "weekly", next_scan_at: next.toISOString() });
    const read = async () =>
      (await service.from("businesses").select("next_scan_at").eq("id", id).single().throwOnError()).data.next_scan_at;

    await service.from("businesses").update({ scan_frequency: "daily" }).eq("id", id).throwOnError();
    expect(new Date((await read())!).getTime()).toBe(next.getTime() - 6 * DAY_MS);

    await service.from("businesses").update({ scan_frequency: "monthly" }).eq("id", id).throwOnError();
    expect(new Date((await read())!).getTime()).toBe(next.getTime() + 23 * DAY_MS);

    const chosen = inDays(3);
    await service.from("businesses").update({ scan_frequency: "weekly", next_scan_at: chosen }).eq("id", id).throwOnError();
    expect(new Date((await read())!).getTime()).toBe(new Date(chosen).getTime());

    const unscheduled = await business(owner, { scan_frequency: "weekly" });
    await service.from("businesses").update({ scan_frequency: "daily" }).eq("id", unscheduled).throwOnError();
    const { data } = await service.from("businesses").select("next_scan_at").eq("id", unscheduled).single().throwOnError();
    expect(data.next_scan_at).toBeNull();
  });
});
