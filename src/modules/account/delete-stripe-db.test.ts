import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, describe, expect, it, vi } from "vitest";
import { env } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/service";
import type { Database } from "@/types/database.types";

// Deleting an account when Stripe refuses (2026-10-14, BUG-162): a subscription Stripe does not have (404) is nothing
// to cancel, so the account goes; a real outage keeps it as it was.
const session = vi.hoisted(() => ({ client: null as SupabaseClient<Database> | null }));
const stripe = vi.hoisted(() => ({ cancelNow: vi.fn<(id: string, key: string) => Promise<void>>(async () => {}) }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => session.client }));
vi.mock("next/cache", () => ({ refresh: vi.fn() }));
vi.mock("next/headers", () => ({ headers: async () => new Headers({ host: "localhost:3077" }) }));
vi.mock("./stripe", () => ({ accountStripeClient: () => ({ mode: "stripe", cancelNow: stripe.cancelNow }) }));

const actions = await import("./actions");
const service = createServiceClient();
const userIds: string[] = [];
afterAll(async () => {
  for (const id of userIds.splice(0)) await service.auth.admin.deleteUser(id);
});

async function account(name: string) {
  const email = `vitest-delete-${randomUUID()}@example.test`;
  const password = `pw-${randomUUID()}`;
  const { data } = await service.auth.admin.createUser({ email, password, email_confirm: true });
  userIds.push(data.user!.id);
  const { data: agency } = await service
    .from("agencies")
    .insert({ owner_user_id: data.user!.id, name, is_test: true, status: "active", stripe_subscription_id: `sub_${randomUUID()}` })
    .select("id")
    .single()
    .throwOnError();
  const client = createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  await client.auth.signInWithPassword({ email, password });
  session.client = client;
  return agency.id;
}

const status = async (id: string) => (await service.from("agencies").select("status").eq("id", id).single().throwOnError()).data.status;

describe("deleting an account when Stripe refuses", () => {
  it("goes ahead when Stripe has no such subscription, and keeps the account when Stripe is down", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    for (const [name, err, deleted] of [
      ["Stripe Down Agency", { type: "StripeConnectionError" }, false],
      ["Missing Sub Agency", { type: "StripeInvalidRequestError", code: "resource_missing", statusCode: 404 }, true],
    ] as const) {
      const agencyId = await account(name);
      stripe.cancelNow.mockRejectedValueOnce(Object.assign(new Error(name), err));
      expect((await actions.deleteAccount({ confirmName: name })).ok).toBe(deleted);
      expect((await status(agencyId)) === "deleted").toBe(deleted);
    }
  });
});
