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

const { auditedChange, changed, PartialChangeError, unchanged } = await import("./dal");

const service = createServiceClient();
const password = `pw-${randomUUID()}`;
const email = `vitest-audit-${randomUUID()}@example.test`;
let userId: string;

async function rowsFor(targetId: string) {
  const { data, error } = await service
    .from("admin_audit_log")
    .select("admin_user_id, action, target_type, target_id, details, outcome, finished_at")
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

describe("auditedChange (B-64, BUG-278)", () => {
  it("writes a started row before the change, then marks it done with the change's details", async () => {
    adminEnv.emails = email;
    const targetId = randomUUID();
    let seenDuringChange: Awaited<ReturnType<typeof rowsFor>> = [];

    const result = await auditedChange("agency.adjust_credits", { type: "agency", id: targetId }, { delta: 50, reason: "goodwill" }, async () => {
      seenDuringChange = await rowsFor(targetId);
      return changed("ok", { transaction_id: "tx-1" });
    });

    expect(result).toBe("ok");
    expect(seenDuringChange).toEqual([
      {
        admin_user_id: userId,
        action: "agency.adjust_credits",
        target_type: "agency",
        target_id: targetId,
        details: { delta: 50, reason: "goodwill" },
        outcome: "started",
        finished_at: null,
      },
    ]);
    expect(await rowsFor(targetId)).toEqual([
      expect.objectContaining({
        details: { delta: 50, reason: "goodwill", transaction_id: "tx-1" },
        outcome: "done",
        finished_at: expect.any(String),
      }),
    ]);
  });

  it("never runs the change when the history row cannot be written", async () => {
    adminEnv.emails = email;
    const targetId = randomUUID();
    const change = vi.fn(async () => changed(true));

    // Postgres jsonb refuses a NUL character, so the insert itself fails.
    await expect(auditedChange("lead.update", { type: "lead", id: targetId }, { note: "bad \u0000 text" }, change)).rejects.toThrow(
      /Could not write admin audit log/,
    );
    expect(change).not.toHaveBeenCalled();
    expect(await rowsFor(targetId)).toEqual([]);
  });

  it("marks the row failed with the error when the change throws, and rethrows", async () => {
    adminEnv.emails = email;
    const targetId = randomUUID();

    await expect(
      auditedChange("agency.suspend", { type: "agency", id: targetId }, { reason: "fraud" }, async () => {
        throw new Error("database went away");
      }),
    ).rejects.toThrow("database went away");
    expect(await rowsFor(targetId)).toEqual([
      expect.objectContaining({
        details: { reason: "fraud", error: "database went away" },
        outcome: "failed",
        finished_at: expect.any(String),
      }),
    ]);
  });

  it("leaves the row started when part of the change went through, and rethrows", async () => {
    adminEnv.emails = email;
    const targetId = randomUUID();

    await expect(
      auditedChange("agency.extend_trial", { type: "agency", id: targetId }, { reason: "promo" }, async () => {
        throw new PartialChangeError("could not save the trial end");
      }),
    ).rejects.toThrow("could not save the trial end");
    expect(await rowsFor(targetId)).toEqual([
      expect.objectContaining({ details: { reason: "promo", error: "could not save the trial end" }, outcome: "started", finished_at: null }),
    ]);
  });

  it("marks the row failed with the reason when nothing changed, and returns the change's result", async () => {
    adminEnv.emails = email;
    const targetId = randomUUID();

    const result = await auditedChange("scan_job.retry", { type: "scan_job", id: targetId }, {}, async () =>
      unchanged({ ok: false, status: 409 }, "not_failed"),
    );
    expect(result).toEqual({ ok: false, status: 409 });
    expect(await rowsFor(targetId)).toEqual([
      expect.objectContaining({ details: { error: "not_failed" }, outcome: "failed", finished_at: expect.any(String) }),
    ]);
  });

  it("refuses a non-admin, runs nothing and writes nothing", async () => {
    adminEnv.emails = "someone-else@example.test";
    const targetId = randomUUID();
    const change = vi.fn(async () => changed(true));

    await expect(auditedChange("lead.update", { type: "lead", id: targetId }, {}, change)).rejects.toMatchObject({
      reason: "forbidden",
      status: 403,
    });
    expect(change).not.toHaveBeenCalled();
    expect(await rowsFor(targetId)).toEqual([]);
  });

  it("rejects a badly named action before running the change", async () => {
    adminEnv.emails = email;
    const change = vi.fn(async () => changed(true));
    await expect(auditedChange("Delete Everything", { type: "lead", id: randomUUID() }, {}, change)).rejects.toThrow();
    expect(change).not.toHaveBeenCalled();
  });
});
