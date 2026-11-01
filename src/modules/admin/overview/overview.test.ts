import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createAgencyWithBusiness, createUser, deleteTestUsers, service, signInAs, type TestSession } from "../admin.test-helpers";
import type { AdminStripeClient } from "../agencies/stripe";

// Runs against the local database `npm test` rebuilds. Other test files add and delete agencies at the same time,
// so while `scope` is set the overview's queries only see this file's agencies (BUG-038).
const session = vi.hoisted((): TestSession => ({ client: null, adminEmails: "" }));
const scope = vi.hoisted(() => ({ agencyIds: null as string[] | null }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => session.client }));
vi.mock("@/lib/supabase/service", async (importOriginal) => {
  const { createServiceClient } = await importOriginal<typeof import("@/lib/supabase/service")>();
  const agencyColumn: Record<string, string> = { agencies: "id", business_subscriptions: "agency_id", scan_jobs: "agency_id" };
  return {
    createServiceClient: () => {
      const db = createServiceClient();
      const ids = scope.agencyIds;
      if (!ids) return db;
      const from = db.from.bind(db);
      return Object.assign(db, {
        from: (table: string) => {
          const query = from(table as never);
          const column = agencyColumn[table];
          if (!column) return query;
          return new Proxy(query, {
            get: (target, key) =>
              key === "select" ? (...args: Parameters<typeof target.select>) => target.select(...args).in(column, ids) : Reflect.get(target, key),
          });
        },
      });
    },
  };
});
vi.mock("@/lib/env", async (importOriginal) => {
  const { env } = await importOriginal<typeof import("@/lib/env")>();
  return { env: new Proxy(env, { get: (t, key) => (key === "ADMIN_EMAILS" ? session.adminEmails : Reflect.get(t, key)) }) };
});

const { loadOverview } = await import("./dal");

const stripeWith = (revenueSince: AdminStripeClient["revenueSince"]): AdminStripeClient => ({
  mode: "stripe",
  extendTrial: async () => {},
  subscriptionStatus: async () => null,
  revenueSince,
});

beforeAll(async () => {
  await signInAs(session, "admin-overview", { admin: true });
});
afterAll(deleteTestUsers);

describe("admin overview (B-65)", () => {
  it("shows Stripe as not connected, or as an error, without failing the page", async () => {
    expect((await loadOverview(new Date(), null)).revenue).toEqual({ state: "not_connected" });
    const broken = stripeWith(async () => {
      throw new Error("down");
    });
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect((await loadOverview(new Date(), broken)).revenue).toEqual({ state: "error" });
  });

  it("reads revenue since the first of the month from Stripe", async () => {
    const revenueSince = vi.fn(async () => 123_400);
    const overview = await loadOverview(new Date("2026-09-29T12:00:00Z"), stripeWith(revenueSince));
    expect(revenueSince).toHaveBeenCalledWith(new Date("2026-09-01T00:00:00Z"));
    expect(overview.revenue).toEqual({ state: "ok", cents: 123_400, mode: "stripe" });
  });

  it("counts a running real trial but no test agency, unfinished signup or ended trial, and lists recent signups and real failed scans", async () => {
    const day = 86_400_000;
    const insertAgency = async (name: string, fields: { trial_ends_at: string | null; stripe_subscription_id: string | null }) => {
      const owner = await createUser("overview-real");
      const { data, error } = await service
        .from("agencies")
        .insert({ owner_user_id: owner.id, name, status: "trialing", is_test: false, ...fields })
        .select("id")
        .single();
      if (error) throw error;
      return data.id;
    };
    const real = await insertAgency("Overview Real", { trial_ends_at: new Date(Date.now() + 5 * day).toISOString(), stripe_subscription_id: "sub_overview_real" });
    const unfinished = await insertAgency("Overview Unfinished", { trial_ends_at: null, stripe_subscription_id: null });
    const ended = await insertAgency("Overview Ended", { trial_ends_at: new Date(Date.now() - day).toISOString(), stripe_subscription_id: "sub_overview_ended" });
    const test = await createAgencyWithBusiness("Overview Test");
    const realWithBusiness = await createAgencyWithBusiness("Overview Real Scans");
    await service.from("agencies").update({ is_test: false, status: "active" }).eq("id", realWithBusiness.agencyId);
    const failedJob = async (a: { agencyId: string; businessId: string }) => {
      const { data, error } = await service
        .from("scan_jobs")
        .insert({
          agency_id: a.agencyId,
          business_id: a.businessId,
          priority: -1_000_000,
          status: "failed",
          error: "Every check failed: timeout",
          finished_at: new Date().toISOString(),
        })
        .select("id")
        .single();
      if (error) throw error;
      return data.id;
    };
    await failedJob(test);
    const realFailed = await failedJob(realWithBusiness);

    scope.agencyIds = [real, unfinished, ended, test.agencyId, realWithBusiness.agencyId];
    const overview = await loadOverview(new Date(), null).finally(() => {
      scope.agencyIds = null;
    });
    expect(overview).toMatchObject({ agencies: 4, activeTrials: 1, payingBusinesses: 0 });
    expect(overview.recentSignups.map((a) => [a.id, a.status])).toEqual([
      [realWithBusiness.agencyId, "active"],
      [test.agencyId, "active"],
      [ended, "trial_ended"],
      [unfinished, "signup_unfinished"],
      [real, "trialing"],
    ]);
    // The test agency's failed scan is left out.
    expect(overview.recentFailedScans).toEqual([
      expect.objectContaining({ id: realFailed, businessId: realWithBusiness.businessId, error: "Every check failed: timeout" }),
    ]);
    // Alert tests run at the same time, so only the shape is checked here (B-69 covers the content).
    for (const a of overview.openAlerts) expect(["info", "warning", "critical"]).toContain(a.severity);

    await service.from("agencies").delete().in("id", [real, unfinished, ended]);
  });

  it("refuses non-admins", async () => {
    await signInAs(session, "user-overview", { admin: false });
    await expect(loadOverview(new Date(), null)).rejects.toThrow();
    await signInAs(session, "admin-overview-2", { admin: true });
  });
});
