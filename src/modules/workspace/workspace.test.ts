import { randomUUID } from "node:crypto";
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { env } from "@/lib/env";
import { adminAdjustCredits, grantCredits } from "@/modules/credits";
import { createServiceClient } from "@/lib/supabase/service";

// B-48 against the local database: the switch action and the numbers behind the usage widget.
const DAY = 24 * 60 * 60 * 1000;
const service = createServiceClient();
const userIds: string[] = [];

async function createUser(prefix: string, password?: string) {
  const email = `vitest-${prefix}-${randomUUID()}@example.test`;
  const { data, error } = await service.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) throw error ?? new Error("no user");
  userIds.push(data.user.id);
  return { email, userId: data.user.id };
}

async function createAgency(businesses: number) {
  const password = `pw-${randomUUID()}`;
  const { email, userId } = await createUser("workspace", password);
  const { data: agency, error } = await service
    .from("agencies")
    .insert({ owner_user_id: userId, name: "Workspace test", is_test: true })
    .select("id")
    .single();
  if (error) throw error;
  const rows = Array.from({ length: businesses }, (_, i) => ({ owner_user_id: userId, agency_id: agency.id, name: `Business ${i}` }));
  const { data: made, error: businessError } = await service.from("businesses").insert(rows).select("id");
  if (businessError) throw businessError;
  return { agencyId: agency.id, businessIds: made.map((b) => b.id), email, password, userId };
}

let session: SupabaseClient | null = null;

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () =>
    session ??
    createSupabaseClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
    }),
}));
vi.mock("next/cache", () => ({ refresh: vi.fn() }));

const { switchBusiness } = await import("./actions");
const { getWorkspace } = await import("./dal");

async function signIn(email: string, password: string) {
  const client = createSupabaseClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  });
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  session = client;
}

beforeEach(() => {
  session = null;
});
afterAll(async () => {
  for (const id of userIds.splice(0)) await service.auth.admin.deleteUser(id);
});

describe("switchBusiness", () => {
  it("returns 401 without a session", async () => {
    expect(await switchBusiness({ businessId: randomUUID() })).toEqual({
      ok: false,
      status: 401,
      error: "Please log in to continue.",
    });
  });

  it("rejects bad input and other people's businesses, and switches to your own", async () => {
    const mine = await createAgency(2);
    const theirs = await createAgency(1);
    await signIn(mine.email, mine.password);

    expect(await switchBusiness({ businessId: "nope" })).toMatchObject({ ok: false, status: 400 });
    expect(await switchBusiness({ businessId: theirs.businessIds[0] })).toMatchObject({ ok: false, status: 404 });

    const target = mine.businessIds[1];
    expect(await switchBusiness({ businessId: target })).toEqual({ ok: true, data: null });
    const { data } = await service.from("profiles").select("active_business_id").eq("id", mine.userId).single();
    expect(data!.active_business_id).toBe(target);
    expect((await getWorkspace()).activeBusinessId).toBe(target);
  });
});

describe("getWorkspace", () => {
  it("lists only your businesses and reads this period's credits from the ledger", async () => {
    const mine = await createAgency(2);
    await createAgency(1);
    const periodEnd = new Date(Date.now() + 12 * DAY);
    await service.from("agencies").update({ status: "active", current_period_end: periodEnd.toISOString() }).eq("id", mine.agencyId);
    await grantCredits({ agencyId: mine.agencyId, source: "plan", sourceId: `in-${randomUUID()}`, amount: 1200, expiresAt: periodEnd });
    await grantCredits({ agencyId: mine.agencyId, source: "topup", sourceId: `cs-${randomUUID()}`, amount: 500, expiresAt: null });
    const { userId: adminUserId } = await createUser("admin");
    await adminAdjustCredits({ agencyId: mine.agencyId, delta: -620, adminUserId, note: "test spend", requestId: randomUUID() });
    await signIn(mine.email, mine.password);

    const workspace = await getWorkspace();
    expect(workspace.businesses.map((b) => b.id).sort()).toEqual([...mine.businessIds].sort());
    expect(workspace.usage).toEqual({ balance: 1080, topupRemaining: 500, periodCredits: 1200, periodUsed: 620 });
    expect(workspace.account).toMatchObject({ status: "active", periodEndsAt: periodEnd });
  });
});
