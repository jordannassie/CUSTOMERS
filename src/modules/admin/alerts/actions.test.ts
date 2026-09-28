import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { deleteTestUsers, service, signInAs, type TestSession } from "../admin.test-helpers";

// Resolve on the admin Overview (B-69) against the local database `npm test` rebuilds.
const session = vi.hoisted((): TestSession => ({ client: null, adminEmails: "" }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => session.client }));
vi.mock("@/lib/env", async (importOriginal) => {
  const { env } = await importOriginal<typeof import("@/lib/env")>();
  return { env: new Proxy(env, { get: (t, key) => (key === "ADMIN_EMAILS" ? session.adminEmails : Reflect.get(t, key)) }) };
});
vi.mock("next/cache", () => ({ refresh: vi.fn() }));

const { resolveAlert } = await import("./actions");

beforeAll(async () => {
  await signInAs(session, "admin-resolve", { admin: true });
});
afterAll(deleteTestUsers);

async function resolveOpen(kind: string) {
  await service.from("system_alerts").update({ resolved_at: new Date().toISOString() }).eq("kind", kind).is("resolved_at", null).throwOnError();
}

async function openOf(kind: string) {
  const { data } = await service.from("system_alerts").select("id").eq("kind", kind).is("resolved_at", null).throwOnError();
  return data;
}

describe("resolveAlert (B-69)", () => {
  it("resolves an open alert with a reason and writes the audit log", async () => {
    await resolveOpen("resolve_test");
    const { data: id } = await service.rpc("raise_system_alert", {
      p_kind: "resolve_test",
      p_severity: "critical",
      p_message: "1 Stripe webhook event failed in the last hour.",
      p_details: {},
    });
    if (!id) throw new Error("no alert opened");

    expect(await resolveAlert({ alertId: id, reason: "no" })).toMatchObject({ ok: false, status: 400 });
    expect(await resolveAlert({ alertId: id, reason: "Replayed the event in Stripe" })).toEqual({ ok: true, data: { alertId: id } });
    expect(await openOf("resolve_test")).toEqual([]);

    const { data: log } = await service
      .from("admin_audit_log")
      .select("action, details")
      .eq("target_type", "system_alert")
      .eq("target_id", id)
      .throwOnError();
    expect(log).toEqual([
      { action: "system_alert.resolve", details: expect.objectContaining({ reason: "Replayed the event in Stripe", kind: "resolve_test" }) },
    ]);

    expect(await resolveAlert({ alertId: id, reason: "Again" })).toMatchObject({ ok: false, status: 409 });
  });

  it("refuses non-admins", async () => {
    await signInAs(session, "user-alerts", { admin: false });
    const result = await resolveAlert({ alertId: randomUUID(), reason: "Not mine to resolve" });
    expect(result).toMatchObject({ ok: false, status: 403 });
    await signInAs(session, "admin-alerts-2", { admin: true });
  });

  it("keeps alerts and provider errors closed to signed-in users (RLS, no policies)", async () => {
    await signInAs(session, "user-alerts-rls", { admin: false });
    for (const table of ["system_alerts", "provider_errors"] as const) {
      const { data } = await session.client!.from(table).select("id").limit(1);
      expect(data ?? []).toEqual([]);
    }
    const { error } = await session.client!.rpc("check_system_alerts", {});
    expect(error?.message).toMatch(/permission denied/);
  });
});
