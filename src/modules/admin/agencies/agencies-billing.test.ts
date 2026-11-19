import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createAgencyWithBusiness, deleteTestUsers, service, signInAs, type TestSession } from "../admin.test-helpers";
import type { Database } from "@/types/database.types";
import type { AdminStripeClient } from "./stripe";

// Suspend pauses Stripe billing and Unsuspend starts it again (admin review 2026-11-12: billing used to carry on while
// a customer was locked out). Same setup as agencies.test.ts: the local test database, a real test admin, a fake Stripe.
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

const REASON = "Support ticket 42";
let agency: Awaited<ReturnType<typeof createAgencyWithBusiness>>;

function fakeStripe(overrides: Partial<AdminStripeClient> = {}): AdminStripeClient {
  return {
    mode: "stripe",
    extendTrial: vi.fn(async () => {}),
    revenueSince: vi.fn(async () => 0),
    subscriptionStatus: vi.fn(async () => null),
    setBillingPaused: vi.fn(async (_id: string, paused: boolean) => (paused ? "paused" : "resumed")),
    ...overrides,
  } as never;
}

async function setAgency(fields: Database["public"]["Tables"]["agencies"]["Update"]) {
  const { error } = await service.from("agencies").update(fields).eq("id", agency.agencyId);
  if (error) throw error;
}

async function readAgency() {
  const { data, error } = await service.from("agencies").select("status").eq("id", agency.agencyId).single();
  if (error) throw error;
  return data;
}

async function auditRows(action: string) {
  const { data, error } = await service
    .from("admin_audit_log")
    .select("details, outcome")
    .eq("target_type", "agency")
    .eq("target_id", agency.agencyId)
    .eq("action", action)
    .order("created_at");
  if (error) throw error;
  return data;
}

beforeAll(async () => {
  await signInAs(session, "admin-billing", { admin: true });
});

beforeEach(async () => {
  stripe.client = null;
  agency = await createAgencyWithBusiness("Agency Billing");
});

afterAll(deleteTestUsers);

describe("suspend and Stripe billing", () => {
  it("stops billing in Stripe on suspend and starts it again on unsuspend", async () => {
    const subscriptionId = `sub_${randomUUID()}`;
    await setAgency({ status: "active", stripe_subscription_id: subscriptionId });
    const setBillingPaused = vi.fn(async (_id: string, paused: boolean) => (paused ? ("paused" as const) : ("resumed" as const)));
    stripe.client = fakeStripe({ setBillingPaused });
    expect((await actions.suspendAgency({ agencyId: agency.agencyId, reason: REASON })).ok).toBe(true);
    expect(setBillingPaused).toHaveBeenLastCalledWith(subscriptionId, true);
    expect((await actions.unsuspendAgency({ agencyId: agency.agencyId, reason: "Paid by phone" })).ok).toBe(true);
    expect(setBillingPaused).toHaveBeenLastCalledWith(subscriptionId, false);
    expect(await auditRows("agency.suspend")).toMatchObject([{ details: { pauses_billing: true }, outcome: "done" }]);
    expect(await auditRows("agency.unsuspend")).toMatchObject([{ details: { resumes_billing: true }, outcome: "done" }]);
  });

  it("does not suspend when Stripe refuses to pause billing, so access and billing never disagree", async () => {
    await setAgency({ status: "active", stripe_subscription_id: `sub_${randomUUID()}` });
    stripe.client = fakeStripe({ setBillingPaused: vi.fn(async () => Promise.reject(new Error("connection reset"))) });
    const result = await actions.suspendAgency({ agencyId: agency.agencyId, reason: REASON });
    expect(result).toMatchObject({ ok: false, status: 502, error: expect.stringContaining("was not suspended") });
    expect((await readAgency()).status).toBe("active");
  });

  it("has no billing to pause for a canceled plan", async () => {
    await setAgency({ status: "canceled", stripe_subscription_id: `sub_${randomUUID()}` });
    const setBillingPaused = vi.fn(async () => "paused" as const);
    stripe.client = fakeStripe({ setBillingPaused });
    expect((await actions.suspendAgency({ agencyId: agency.agencyId, reason: REASON })).ok).toBe(true);
    expect(setBillingPaused).not.toHaveBeenCalled();
  });
});

describe("extend trial", () => {
  it("refuses a trial that has already ended and asks Stripe nothing (admin audit 2026-11-12)", async () => {
    await setAgency({ status: "trialing", trial_ends_at: new Date(Date.now() - 86_400_000).toISOString(), stripe_subscription_id: `sub_${randomUUID()}` });
    stripe.client = fakeStripe();
    const result = await actions.extendTrial({ agencyId: agency.agencyId, days: 7, reason: REASON });
    expect(result).toMatchObject({ ok: false, status: 409, error: expect.stringContaining("already ended") });
    expect(stripe.client.extendTrial).not.toHaveBeenCalled();
    expect(await auditRows("agency.extend_trial")).toEqual([]);
  });
});
