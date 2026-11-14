import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { env } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/service";
import type { Database } from "@/types/database.types";

// B-61: email_log and the weekly report preference, against the local database `npm test` rebuilds.
const session = vi.hoisted(() => ({ agencyId: "" }));
vi.mock("@/modules/auth", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/modules/auth")>()),
  requireAgency: async () => ({ agency: { id: session.agencyId } }),
}));

const { createEmailStore, getMyEmailPreferences, unsubscribeAgency } = await import("./dal");
const { saveEmailPreferences } = await import("./actions");

const service = createServiceClient();
const owner = { email: `vitest-email-${randomUUID()}@example.test`, password: `pw-${randomUUID()}`, id: "" };

beforeAll(async () => {
  const { data, error } = await service.auth.admin.createUser({ email: owner.email, password: owner.password, email_confirm: true });
  if (error || !data.user) throw error ?? new Error("no user");
  owner.id = data.user.id;
  const agency = await service.from("agencies").insert({ owner_user_id: owner.id, name: "Email Test", is_test: true }).select("id").single();
  if (agency.error) throw agency.error;
  session.agencyId = agency.data.id;
});

afterAll(async () => {
  await service.from("email_log").delete().eq("agency_id", session.agencyId);
  if (owner.id) await service.auth.admin.deleteUser(owner.id);
});

describe("email dal", () => {
  it("logs sends and finds a sent idempotency key, ignoring failed tries", async () => {
    const store = createEmailStore();
    const key = `test:${randomUUID()}`;
    const row = { type: "trial_ending" as const, agencyId: session.agencyId, to: owner.email, idempotencyKey: key };

    await store.record({ ...row, status: "failed", error: "provider down" });
    expect(await store.hasSent(key)).toBe(false);

    await store.record({ ...row, status: "sent", providerId: "re_test_1" });
    // A parallel send logging the same key again is ignored, not an error.
    await store.record({ ...row, status: "sent", providerId: "re_test_2" });
    expect(await store.hasSent(key)).toBe(true);

    const { data } = await service.from("email_log").select("status, provider_id, sent_at").eq("idempotency_key", key).order("sent_at");
    expect(data?.map((r) => [r.status, r.provider_id])).toEqual([["failed", null], ["sent", "re_test_1"]]);
    expect(data?.every((r) => r.sent_at)).toBe(true);
  });

  it("rejects an unknown email type", async () => {
    const { error } = await service.from("email_log").insert({ type: "newsletter", to_email: owner.email, status: "sent" });
    expect(error?.code).toBe("23514");
  });

  it("weekly report is on by default and turns off by unsubscribe or settings", async () => {
    const store = createEmailStore();
    expect(await store.wantsEmail(session.agencyId, "weekly_report")).toBe(true);
    expect(await getMyEmailPreferences()).toEqual({ weeklyReport: true });

    expect(await unsubscribeAgency(session.agencyId, "weekly_report")).toBe(true);
    expect(await store.wantsEmail(session.agencyId, "weekly_report")).toBe(false);

    expect(await saveEmailPreferences({ weeklyReport: true })).toEqual({ ok: true, data: { weeklyReport: true } });
    expect(await getMyEmailPreferences()).toEqual({ weeklyReport: true });
    expect(await saveEmailPreferences({ weeklyReport: "yes" })).toMatchObject({ ok: false, status: 400 });

    expect(await unsubscribeAgency(randomUUID(), "weekly_report")).toBe(false);
  });

  it("signed-in users and visitors cannot read or write the email log", async () => {
    await createEmailStore().record({ type: "welcome", agencyId: session.agencyId, to: owner.email, status: "sent", providerId: "re_rls" });

    const asOwner = createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
    await asOwner.auth.signInWithPassword({ email: owner.email, password: owner.password });
    const { data: seen } = await asOwner.from("email_log").select("id");
    expect(seen).toEqual([]);

    const anon = createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    const { error } = await anon.from("email_log").insert({ type: "welcome", to_email: "x@example.test", status: "sent" });
    expect(error).not.toBeNull();

    // Owners can read their agency but not flip the preference directly; it goes through the checked action.
    await asOwner.from("agencies").update({ weekly_report_emails: false }).eq("id", session.agencyId);
    expect(await createEmailStore().wantsEmail(session.agencyId, "weekly_report")).toBe(true);
  });
});
