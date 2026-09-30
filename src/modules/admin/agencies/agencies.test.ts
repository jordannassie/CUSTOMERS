import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { grantCredits } from "@/modules/credits";
import { createAgencyWithBusiness, deleteTestUsers, service, signInAs, type TestSession } from "../admin.test-helpers";
import type { Database } from "@/types/database.types";
import type { AdminStripeClient } from "./stripe";

// Runs against the local database `npm test` rebuilds, signed in as a real test user. Stripe is always a fake.
const session = vi.hoisted((): TestSession => ({ client: null, adminEmails: "" }));
const stripe = vi.hoisted(() => ({ client: null as AdminStripeClient | null }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => session.client }));
vi.mock("@/lib/env", async (importOriginal) => {
  const { env } = await importOriginal<typeof import("@/lib/env")>();
  return { env: new Proxy(env, { get: (t, key) => (key === "ADMIN_EMAILS" ? session.adminEmails : Reflect.get(t, key)) }) };
});
vi.mock("next/cache", () => ({ refresh: vi.fn() }));
vi.mock("./stripe", () => ({ adminStripeClient: () => stripe.client, adminStripeConnected: () => stripe.client !== null }));

const actions = await import("./actions");
const { listAgencies } = await import("./dal");
const { loadAgencyDetail } = await import("./detail/dal");

const REASON = "Support ticket 42";
const DAY = 86_400_000;
let agency: Awaited<ReturnType<typeof createAgencyWithBusiness>>;

function fakeStripe(overrides: Partial<AdminStripeClient> = {}): AdminStripeClient & { extendTrial: ReturnType<typeof vi.fn> } {
  return { mode: "stripe", extendTrial: vi.fn(async () => {}), revenueSince: vi.fn(async () => 0), ...overrides } as never;
}

async function setAgency(fields: Database["public"]["Tables"]["agencies"]["Update"]) {
  const { error } = await service.from("agencies").update(fields).eq("id", agency.agencyId);
  if (error) throw error;
}

async function readAgency() {
  const { data, error } = await service
    .from("agencies")
    .select("status, is_test, trial_ends_at, deleted_at, purge_after")
    .eq("id", agency.agencyId)
    .single();
  if (error) throw error;
  return data;
}

async function auditRows(action: string) {
  const { data, error } = await service
    .from("admin_audit_log")
    .select("action, admin_user_id, details")
    .eq("target_type", "agency")
    .eq("target_id", agency.agencyId)
    .eq("action", action);
  if (error) throw error;
  return data;
}

let adminId: string;

beforeAll(async () => {
  adminId = (await signInAs(session, "admin-agency", { admin: true })).id;
});

beforeEach(async () => {
  stripe.client = null;
  agency = await createAgencyWithBusiness("Agency Actions");
});

afterAll(deleteTestUsers);

describe("agency actions (B-65)", () => {
  it("refuses non-admins and changes nothing", async () => {
    await signInAs(session, "user-agency", { admin: false });
    const result = await actions.suspendAgency({ agencyId: agency.agencyId, reason: REASON });
    expect(result).toMatchObject({ ok: false, status: 403 });
    expect((await readAgency()).status).toBe("active");
    adminId = (await signInAs(session, "admin-agency", { admin: true })).id;
  });

  it("needs a reason", async () => {
    const result = await actions.suspendAgency({ agencyId: agency.agencyId, reason: "" });
    expect(result).toMatchObject({ ok: false, status: 400 });
    expect(await auditRows("agency.suspend")).toHaveLength(0);
  });

  it("adds and removes credits through the ledger, once per request, with an audit row", async () => {
    await grantCredits({ agencyId: agency.agencyId, source: "plan", sourceId: randomUUID(), amount: 100, expiresAt: new Date(Date.now() + 30 * DAY) });
    const requestId = randomUUID();
    const add = await actions.adjustCredits({ agencyId: agency.agencyId, delta: 250, reason: REASON, requestId });
    expect(add.ok).toBe(true);
    // A double submit reuses the request ID and must not add again.
    await actions.adjustCredits({ agencyId: agency.agencyId, delta: 250, reason: REASON, requestId });
    const remove = await actions.adjustCredits({ agencyId: agency.agencyId, delta: -400, reason: REASON, requestId: randomUUID() });
    expect(remove.ok).toBe(true);

    const { data: ledger } = await service
      .from("credit_transactions")
      .select("delta, kind, admin_user_id, note")
      .eq("agency_id", agency.agencyId)
      .eq("kind", "admin_adjust")
      .order("created_at");
    expect(ledger).toEqual([
      { delta: 250, kind: "admin_adjust", admin_user_id: adminId, note: REASON },
      { delta: -400, kind: "admin_adjust", admin_user_id: adminId, note: REASON },
    ]);
    // 100 plan + 250 admin - 400 removed: grants run dry and 50 becomes overdraft.
    const detail = await loadAgencyDetail(agency.agencyId);
    expect(detail?.balance).toMatchObject({ plan: 0, topup: 0, overdraft: 50 });

    const audit = await auditRows("agency.adjust_credits");
    expect(audit.length).toBeGreaterThanOrEqual(2);
    expect(audit[0]).toMatchObject({ admin_user_id: adminId, details: { reason: REASON } });
  });

  it("extends a trial in Stripe first, then saves it and logs it", async () => {
    const end = new Date(Date.now() + 2 * DAY).toISOString();
    await setAgency({ status: "trialing", trial_ends_at: end, stripe_subscription_id: `sub_${randomUUID()}` });
    stripe.client = fakeStripe();

    const result = await actions.extendTrial({ agencyId: agency.agencyId, days: 7, reason: REASON });
    expect(result.ok).toBe(true);
    const expected = new Date(new Date(end).getTime() + 7 * DAY);
    expect(stripe.client.extendTrial).toHaveBeenCalledWith(expect.stringMatching(/^sub_/), expected);
    expect(new Date((await readAgency()).trial_ends_at!).getTime()).toBe(expected.getTime());
    expect(await auditRows("agency.extend_trial")).toMatchObject([{ details: { reason: REASON, days: 7 } }]);
  });

  it("changes nothing when Stripe is not connected or refuses", async () => {
    const end = new Date(Date.now() + 2 * DAY).toISOString();
    await setAgency({ status: "trialing", trial_ends_at: end, stripe_subscription_id: `sub_${randomUUID()}` });

    expect(await actions.extendTrial({ agencyId: agency.agencyId, days: 7, reason: REASON })).toMatchObject({ ok: false, status: 503 });
    stripe.client = fakeStripe({ extendTrial: vi.fn(async () => { throw new Error("No such subscription"); }) });
    expect(await actions.extendTrial({ agencyId: agency.agencyId, days: 7, reason: REASON })).toMatchObject({ ok: false, status: 502 });

    expect(new Date((await readAgency()).trial_ends_at!).getTime()).toBe(new Date(end).getTime());
    expect(await auditRows("agency.extend_trial")).toHaveLength(0);
  });

  it("suspends and unsuspends back to the status it had", async () => {
    await setAgency({ status: "past_due" });
    expect((await actions.suspendAgency({ agencyId: agency.agencyId, reason: REASON })).ok).toBe(true);
    expect((await readAgency()).status).toBe("suspended");
    expect((await actions.unsuspendAgency({ agencyId: agency.agencyId, reason: "Paid by phone" })).ok).toBe(true);
    expect((await readAgency()).status).toBe("past_due");

    expect(await auditRows("agency.suspend")).toMatchObject([{ details: { reason: REASON, previous_status: "past_due" } }]);
    expect(await auditRows("agency.unsuspend")).toMatchObject([{ details: { reason: "Paid by phone", new_status: "past_due" } }]);
  });

  it("restores a deleted account before its purge date, and not after", async () => {
    await setAgency({
      status: "deleted",
      deleted_at: new Date(Date.now() - 31 * DAY).toISOString(),
      purge_after: new Date(Date.now() - DAY).toISOString(),
    });
    expect(await actions.restoreAgency({ agencyId: agency.agencyId, reason: REASON })).toMatchObject({ ok: false, status: 409 });
    expect((await readAgency()).status).toBe("deleted");

    await setAgency({ deleted_at: new Date(Date.now() - 10 * DAY).toISOString(), purge_after: new Date(Date.now() + 20 * DAY).toISOString() });
    expect((await actions.restoreAgency({ agencyId: agency.agencyId, reason: REASON })).ok).toBe(true);
    expect(await readAgency()).toMatchObject({ status: "canceled", deleted_at: null, purge_after: null });
    expect(await auditRows("agency.restore")).toMatchObject([{ admin_user_id: adminId, details: { reason: REASON } }]);
  });

  it("marks an agency as test and back", async () => {
    await setAgency({ is_test: false });
    expect((await actions.markAgencyTest({ agencyId: agency.agencyId, isTest: true, reason: REASON })).ok).toBe(true);
    expect((await readAgency()).is_test).toBe(true);
    expect(await actions.markAgencyTest({ agencyId: agency.agencyId, isTest: true, reason: REASON })).toMatchObject({ ok: false });
    expect(await auditRows("agency.mark_test")).toMatchObject([{ details: { reason: REASON, is_test: true } }]);
  });

  it("lists the agency with owner, businesses and balance, and shows actions in its history", async () => {
    await actions.adjustCredits({ agencyId: agency.agencyId, delta: 30, reason: REASON, requestId: randomUUID() });
    const { rows } = await listAgencies("test");
    const row = rows.find((r) => r.id === agency.agencyId);
    expect(row).toMatchObject({ businesses: 1, isTest: true, credits: { plan: 30 } });
    expect(row?.ownerEmail).toMatch(/@example\.test$/);

    const detail = await loadAgencyDetail(agency.agencyId);
    expect(detail?.audit[0]).toMatchObject({ action: "agency.adjust_credits", reason: REASON });
    expect(detail?.ledger[0]).toMatchObject({ delta: 30, kind: "admin_adjust", note: REASON });
  });
});
