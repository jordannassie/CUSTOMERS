import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { env } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/service";
import type { Database } from "@/types/database.types";

// Runs against the local database `npm test` rebuilds, signed in as a real test user.
let current: SupabaseClient<Database>;
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => current }));
const adminEnv = vi.hoisted(() => ({ emails: "" }));
vi.mock("@/lib/env", async (importOriginal) => {
  const { env } = await importOriginal<typeof import("@/lib/env")>();
  return {
    env: new Proxy(env, { get: (target, key) => (key === "ADMIN_EMAILS" ? adminEnv.emails : Reflect.get(target, key)) }),
  };
});

const { logAdminAction } = await import("./dal");

const service = createServiceClient();
const password = `pw-${randomUUID()}`;
const email = `vitest-audit-${randomUUID()}@example.test`;
let userId: string;

async function rowsFor(targetId: string) {
  const { data, error } = await service
    .from("admin_audit_log")
    .select("admin_user_id, action, target_type, target_id, details")
    .eq("target_id", targetId);
  if (error) throw error;
  return data;
}

beforeAll(async () => {
  const { data, error } = await service.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) throw error ?? new Error("no user");
  userId = data.user.id;
  current = createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  });
  const { error: signInError } = await current.auth.signInWithPassword({ email, password });
  if (signInError) throw signInError;
});

afterAll(async () => {
  if (userId) await service.auth.admin.deleteUser(userId);
});

describe("logAdminAction (B-64)", () => {
  it("writes who, what, which target and the reason", async () => {
    adminEnv.emails = email;
    const targetId = randomUUID();

    await logAdminAction("agency.adjust_credits", { type: "agency", id: targetId }, { delta: 50, reason: "goodwill" });

    expect(await rowsFor(targetId)).toEqual([
      {
        admin_user_id: userId,
        action: "agency.adjust_credits",
        target_type: "agency",
        target_id: targetId,
        details: { delta: 50, reason: "goodwill" },
      },
    ]);
  });

  it("refuses a non-admin and writes nothing", async () => {
    adminEnv.emails = "someone-else@example.test";
    const targetId = randomUUID();

    await expect(logAdminAction("lead.update", { type: "lead", id: targetId })).rejects.toMatchObject({
      reason: "forbidden",
      status: 403,
    });
    expect(await rowsFor(targetId)).toEqual([]);
  });

  it("rejects a badly named action", async () => {
    adminEnv.emails = email;
    await expect(logAdminAction("Delete Everything", { type: "lead", id: randomUUID() })).rejects.toThrow();
  });
});
