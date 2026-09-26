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
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT ${url}`);
  },
}));

const { requireAdmin, requireAgency, requireUser } = await import("./dal");

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

  it.each(["suspended", "deleted"])("requireAgency blocks a %s agency", async (status) => {
    await setAgencyStatus(status);
    await expect(requireAgency()).rejects.toMatchObject({ reason: "agency_paused", status: 403 });
    await expect(requireAgency({ next: "/dashboard" })).rejects.toThrow("REDIRECT /account-paused");
    await setAgencyStatus("active");
  });

  it("requireAdmin rejects a normal user", async () => {
    await expect(requireAdmin()).rejects.toMatchObject({ reason: "forbidden", status: 403 });
    await expect(requireAdmin({ next: "/internal/admin" })).rejects.toThrow("REDIRECT /dashboard");
  });

  it("requireAdmin accepts profiles.account_type = admin", async () => {
    const { error } = await service.from("profiles").update({ account_type: "admin" }).eq("id", userId);
    if (error) throw error;
    expect(await requireAdmin()).toEqual({ id: userId, email });
  });
});
