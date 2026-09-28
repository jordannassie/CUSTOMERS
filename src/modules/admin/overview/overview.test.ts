import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createAgencyWithBusiness, createUser, deleteTestUsers, service, signInAs, type TestSession } from "../admin.test-helpers";
import type { AdminStripeClient } from "../agencies/stripe";

// Runs against the local database `npm test` rebuilds. Other test files write at the same time, so counts are compared loosely.
const session = vi.hoisted((): TestSession => ({ client: null, adminEmails: "" }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => session.client }));
vi.mock("@/lib/env", async (importOriginal) => {
  const { env } = await importOriginal<typeof import("@/lib/env")>();
  return { env: new Proxy(env, { get: (t, key) => (key === "ADMIN_EMAILS" ? session.adminEmails : Reflect.get(t, key)) }) };
});

const { loadOverview } = await import("./dal");

const stripeWith = (revenueSince: AdminStripeClient["revenueSince"]): AdminStripeClient => ({
  mode: "stripe",
  extendTrial: async () => {},
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

  it("counts a real trial, lists recent signups and failed scans newest first, and has no alerts yet", async () => {
    const before = await loadOverview(new Date(), null);
    const owner = await createUser("overview-real");
    const { data: real, error } = await service
      .from("agencies")
      .insert({ owner_user_id: owner.id, name: "Overview Real", status: "trialing", is_test: false })
      .select("id")
      .single();
    if (error) throw error;
    const test = await createAgencyWithBusiness("Overview Test");
    const { error: jobError } = await service.from("scan_jobs").insert({
      agency_id: test.agencyId,
      business_id: test.businessId,
      priority: -1_000_000,
      status: "failed",
      error: "Every check failed: timeout",
      finished_at: new Date().toISOString(),
    });
    if (jobError) throw jobError;

    const after = await loadOverview(new Date(), null);
    expect(after.activeTrials).toBeGreaterThanOrEqual(before.activeTrials + 1);
    // Newest first and capped; parallel test files may have added newer rows than ours.
    const signedUp = after.recentSignups.map((a) => a.createdAt);
    expect(signedUp).toEqual([...signedUp].sort().reverse());
    expect(signedUp.length).toBeGreaterThan(0);
    expect(after.recentFailedScans.length).toBeGreaterThan(0);
    expect(after.recentFailedScans.length).toBeLessThanOrEqual(6);
    expect(after.openAlerts).toEqual([]);

    await service.from("agencies").delete().eq("id", real.id);
  });

  it("refuses non-admins", async () => {
    await signInAs(session, "user-overview", { admin: false });
    await expect(loadOverview(new Date(), null)).rejects.toThrow();
    await signInAs(session, "admin-overview-2", { admin: true });
  });
});
