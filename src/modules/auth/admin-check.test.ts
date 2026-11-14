import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Database } from "@/types/database.types";

// No database: the session client and the confirmed-address lookup are stand-ins, so only the admin rule is tested.
let current: SupabaseClient<Database>;
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => current }));
const adminEnv = vi.hoisted(() => ({ emails: "" }));
vi.mock("@/lib/env", async (importOriginal) => {
  const { env } = await importOriginal<typeof import("@/lib/env")>();
  return {
    env: new Proxy(env, { get: (target, key) => (key === "ADMIN_EMAILS" ? adminEnv.emails : Reflect.get(target, key)) }),
  };
});
const adminConfirm = vi.hoisted(() => ({ override: true, calls: 0 }));
vi.mock("./admin-email/dal", () => ({
  adminEmailConfirmed: async () => {
    adminConfirm.calls++;
    return adminConfirm.override;
  },
}));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT ${url}`);
  },
}));

const { isCurrentUserAdmin, requireAdmin } = await import("./dal");

// Perf fix #4: the admin check reads the address from the signature-checked token and never waits on Supabase Auth's
// /user endpoint; whether the address is confirmed comes from admin-email/dal.ts (cached across requests).
describe("admin check without an Auth round trip", () => {
  const adminAddress = "boss@example.test";
  let getUserCalls = 0;
  function sessionWith(claimEmail: string | undefined) {
    const claims = { sub: randomUUID(), ...(claimEmail !== undefined && { email: claimEmail }) };
    // The user has an agency, so getCurrentUser does not need Supabase Auth either.
    const agency = { id: randomUUID(), name: "Boss Agency", status: "active", is_test: false };
    const oneRow = { select: () => oneRow, eq: () => oneRow, maybeSingle: async () => ({ data: agency, error: null }) };
    return {
      auth: {
        getClaims: async () => ({ data: { claims }, error: null }),
        getUser: async () => {
          getUserCalls++;
          throw new Error("getUser must not be called by the admin check");
        },
      },
      from: () => oneRow,
    } as unknown as SupabaseClient<Database>;
  }

  beforeEach(() => {
    adminEnv.emails = `someone@example.test, ${adminAddress.toUpperCase()}`;
    adminConfirm.override = true;
    adminConfirm.calls = 0;
    getUserCalls = 0;
  });
  afterAll(() => {
    adminEnv.emails = "";
    adminConfirm.override = true;
  });

  it("lets in a confirmed address on the list, whatever its case", async () => {
    current = sessionWith("Boss@Example.test");
    expect(await requireAdmin()).toMatchObject({ email: "Boss@Example.test" });
    expect(getUserCalls).toBe(0);
    expect(adminConfirm.calls).toBe(1);
  });

  it("refuses an address that is not on the list, without asking Auth", async () => {
    current = sessionWith("intruder@example.test");
    await expect(requireAdmin()).rejects.toMatchObject({ reason: "forbidden" });
    expect(adminConfirm.calls).toBe(0);
    expect(getUserCalls).toBe(0);
  });

  it("refuses a token with no email", async () => {
    current = sessionWith(undefined);
    await expect(requireAdmin()).rejects.toMatchObject({ reason: "forbidden" });
    expect(adminConfirm.calls).toBe(0);
    expect(getUserCalls).toBe(0);
  });

  it("refuses an address on the list that Auth has not confirmed", async () => {
    adminConfirm.override = false;
    current = sessionWith(adminAddress);
    await expect(requireAdmin()).rejects.toMatchObject({ reason: "forbidden" });
    expect(getUserCalls).toBe(0);
  });
});

// An address in ADMIN_EMAILS is only trusted once its owner has confirmed it.
describe("unconfirmed admin address", () => {
  const adminAddress = "owner@example.test";
  function sessionFor(emailConfirmedAt: string | null) {
    adminConfirm.override = emailConfirmedAt !== null;
    const user = { id: randomUUID(), email: adminAddress, email_confirmed_at: emailConfirmedAt };
    // The session token names the user; only the admin check asks Supabase Auth whether the address is confirmed.
    const claims = { sub: user.id, email: adminAddress };
    // No agency yet, so the user is also confirmed with Supabase Auth (getCurrentUser).
    const noRows = { select: () => noRows, eq: () => noRows, maybeSingle: async () => ({ data: null, error: null }) };
    return {
      auth: {
        getClaims: async () => ({ data: { claims }, error: null }),
        getUser: async () => ({ data: { user }, error: null }),
      },
      from: () => noRows,
    } as unknown as SupabaseClient<Database>;
  }

  beforeEach(() => {
    adminEnv.emails = adminAddress;
  });
  afterAll(() => {
    adminEnv.emails = "";
    adminConfirm.override = true;
  });

  it("is not an admin until the email is confirmed", async () => {
    current = sessionFor(null);
    await expect(requireAdmin()).rejects.toMatchObject({ reason: "forbidden", status: 403 });
    await expect(requireAdmin({ next: "/internal/admin" })).rejects.toThrow("REDIRECT /dashboard");
    expect(await isCurrentUserAdmin()).toBe(false);
  });

  it("is an admin once confirmed", async () => {
    current = sessionFor(new Date().toISOString());
    expect(await requireAdmin()).toMatchObject({ email: adminAddress });
    expect(await isCurrentUserAdmin()).toBe(true);
  });
});
