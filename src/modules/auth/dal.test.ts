import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { env } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/service";
import type { Database } from "@/types/database.types";

// Runs against the local database `npm test` rebuilds. The cookie-based server client is swapped
// for a plain client that is either signed out or signed in as the test user.
let current: SupabaseClient<Database>;
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => current }));
const adminEnv = vi.hoisted(() => ({ emails: "" }));
vi.mock("@/lib/env", async (importOriginal) => {
  const { env } = await importOriginal<typeof import("@/lib/env")>();
  return {
    env: new Proxy(env, { get: (target, key) => (key === "ADMIN_EMAILS" ? adminEnv.emails : Reflect.get(target, key)) }),
  };
});
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT ${url}`);
  },
}));

const { isCurrentUserAdmin, requireAdmin, requireAgency, requireUser } = await import("./dal");
const { authFailure } = await import("./errors");

const service = createServiceClient();
const password = `pw-${randomUUID()}`;
const email = `vitest-auth-${randomUUID()}@example.test`;
let userId: string;
let agencyId: string;

function anonClient() {
  return createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  });
}

async function signedIn() {
  const client = anonClient();
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return client;
}

async function setAgencyStatus(status: string) {
  const { error } = await service.from("agencies").update({ status }).eq("id", agencyId);
  if (error) throw error;
}

beforeAll(async () => {
  const { data, error } = await service.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) throw error ?? new Error("no user");
  userId = data.user.id;
});

afterAll(async () => {
  if (userId) await service.auth.admin.deleteUser(userId);
});

describe("signed out", () => {
  beforeEach(() => {
    current = anonClient();
  });

  it("requireUser throws a 401 for actions and routes", async () => {
    await expect(requireUser()).rejects.toMatchObject({ name: "AuthError", status: 401 });
  });

  it("requireUser sends pages to login and back", async () => {
    await expect(requireUser({ next: "/dashboard/reports" })).rejects.toThrow(
      "REDIRECT /login?next=%2Fdashboard%2Freports",
    );
  });

  it("requireAgency and requireAdmin also throw a 401", async () => {
    await expect(requireAgency()).rejects.toMatchObject({ status: 401 });
    await expect(requireAdmin()).rejects.toMatchObject({ status: 401 });
  });

  it("isCurrentUserAdmin is false", async () => {
    expect(await isCurrentUserAdmin()).toBe(false);
  });
});

describe("signed in", () => {
  beforeAll(async () => {
    current = await signedIn();
  });

  it("requireUser returns only the id and email", async () => {
    expect(await requireUser()).toEqual({ id: userId, email });
  });

  it("requireAgency needs an agency", async () => {
    await expect(requireAgency()).rejects.toMatchObject({ reason: "no_agency", status: 403 });
  });

  it("requireAgency returns the user's own agency", async () => {
    const { data, error } = await service
      .from("agencies")
      .insert({ owner_user_id: userId, name: "Auth test agency", is_test: true, status: "active" })
      .select("id")
      .single();
    if (error) throw error;
    agencyId = data.id;

    const { agency } = await requireAgency();
    expect(agency).toEqual({ id: agencyId, name: "Auth test agency", status: "active", isTest: true });
  });

  it.each([
    ["suspended", "agency_paused", "/account-paused"],
    ["deleted", "agency_deleted", "/account-deleted"],
  ])("requireAgency blocks a %s agency", async (status, reason, path) => {
    await setAgencyStatus(status);
    await expect(requireAgency()).rejects.toMatchObject({ reason, status: 403 });
    await expect(requireAgency({ next: "/dashboard" })).rejects.toThrow(`REDIRECT ${path}`);
    await setAgencyStatus("active");
  });

  it("requireAdmin rejects a normal user", async () => {
    await expect(requireAdmin()).rejects.toMatchObject({ reason: "forbidden", status: 403 });
    await expect(requireAdmin({ next: "/internal/admin" })).rejects.toThrow("REDIRECT /dashboard");
    expect(await isCurrentUserAdmin()).toBe(false);
  });

  it("requireAdmin ignores profiles.account_type = admin", async () => {
    const { error } = await service.from("profiles").update({ account_type: "admin" }).eq("id", userId);
    if (error) throw error;
    await expect(requireAdmin()).rejects.toMatchObject({ reason: "forbidden", status: 403 });
    await expect(requireAdmin({ next: "/internal/admin" })).rejects.toThrow("REDIRECT /dashboard");
    expect(await isCurrentUserAdmin()).toBe(false);
  });

  it("requireAdmin accepts an email in ADMIN_EMAILS", async () => {
    adminEnv.emails = `other@example.test, ${email.toUpperCase()}`;
    try {
      expect(await requireAdmin()).toEqual({ id: userId, email });
      expect(await isCurrentUserAdmin()).toBe(true);
    } finally {
      adminEnv.emails = "";
    }
  });
});

// E2E-0929 BUG-4 and BUG-5: a slow or failing auth server is not a sign-out.
describe("auth server unavailable", () => {
  let outage: "none" | "network" | "gateway" = "none";
  const flaky: typeof fetch = async (input, init) => {
    if (outage === "network") throw new TypeError("fetch failed");
    if (outage === "gateway") return new Response("upstream timed out", { status: 504 });
    return fetch(input, init);
  };

  beforeAll(async () => {
    outage = "none";
    const client = createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
      global: { fetch: flaky },
    });
    const { error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw error;
    current = client;
  });
  afterAll(() => {
    outage = "none";
  });

  it.each(["network", "gateway"] as const)("gives a 503, never a 401 or a login redirect, on a %s failure", async (kind) => {
    outage = kind;
    const unavailable = { name: "AuthError", reason: "unavailable", status: 503 };
    await expect(requireUser()).rejects.toMatchObject(unavailable);
    await expect(requireUser({ next: "/questions" })).rejects.toMatchObject(unavailable);
    await expect(requireAgency({ next: "/dashboard" })).rejects.toMatchObject(unavailable);
    await expect(requireAdmin()).rejects.toMatchObject(unavailable);
    await expect(requireUser()).rejects.toThrow("We couldn't check your account just now. Try again in a moment.");
  });

  it("an action turns it into a retryable message", async () => {
    outage = "network";
    const result = await requireUser().then(
      () => null,
      (error: unknown) => authFailure(error),
    );
    expect(result).toEqual({ ok: false, status: 503, error: "We couldn't check your account just now. Try again in a moment." });
  });

  it("works again once the server answers", async () => {
    outage = "none";
    expect(await requireUser()).toEqual({ id: userId, email });
  });
});
