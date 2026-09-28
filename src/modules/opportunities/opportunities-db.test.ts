import { randomUUID } from "node:crypto";
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, describe, expect, it, vi } from "vitest";
import { env } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/service";

// B-52 against the local database: status changes and checklist ticks only reach the agency's own
// business, and a ticked item survives the next scan's replacement of open opportunities.
vi.setConfig({ testTimeout: 30_000 });
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const service = createServiceClient();
const userIds: string[] = [];
let session: SupabaseClient | null = null;

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () =>
    session ??
    createSupabaseClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } }),
}));

const { setChecklistItem, setOpportunityStatus } = await import("./actions");
const { getOpportunitiesPage } = await import("./dal");

async function seed() {
  const email = `vitest-opps-${randomUUID()}@example.test`;
  const password = `pw-${randomUUID()}`;
  const { data, error } = await service.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) throw error ?? new Error("no user");
  userIds.push(data.user.id);
  const { data: agency } = await service
    .from("agencies")
    .insert({ owner_user_id: data.user.id, name: "Opportunities test", is_test: true })
    .select("id")
    .single()
    .throwOnError();
  const { data: business } = await service
    .from("businesses")
    .insert({ owner_user_id: data.user.id, agency_id: agency.id, name: "Nowhere Plumbing", status: "active", has_website: false, primary_city: "Springfield" })
    .select("id")
    .single()
    .throwOnError();
  const { data: opps } = await service
    .from("opportunities")
    .insert([
      { business_id: business.id, title: "Low fix", impact: "low", category: "content", recommended_action: "1. One.\n2. Two." },
      { business_id: business.id, title: "High fix", impact: "high", category: "content", claude_prompt: "Write a page." },
    ])
    .select("id, title")
    .throwOnError();
  const client = createSupabaseClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  const signIn = await client.auth.signInWithPassword({ email, password });
  if (signIn.error) throw signIn.error;
  return { businessId: business.id, opps, client };
}

afterAll(async () => {
  for (const id of userIds) await service.auth.admin.deleteUser(id);
});

describe("opportunities against the database", () => {
  it("lists fixes by impact, shows the checklist, and changes status", async () => {
    const me = await seed();
    session = me.client;
    const page = await getOpportunitiesPage(me.businessId);
    expect(page?.items.map((i) => i.title)).toEqual(["High fix", "Low fix"]);
    expect(page?.checklist?.missing).toEqual(["a website", "a Google Business Profile", "a phone number"]);

    const high = me.opps.find((o) => o.title === "High fix")!;
    expect(await setOpportunityStatus({ businessId: me.businessId, opportunityId: high.id, status: "done" })).toEqual({ ok: true, data: { status: "done" } });
    const { data } = await service.from("opportunities").select("status").eq("id", high.id).single().throwOnError();
    expect(data.status).toBe("resolved");
    expect((await getOpportunitiesPage(me.businessId))?.items.find((i) => i.id === high.id)?.status).toBe("done");
  });

  it("ticks and unticks a checklist item, and a new scan does not remove the tick", async () => {
    const me = await seed();
    session = me.client;
    expect(await setChecklistItem({ businessId: me.businessId, key: "website", done: true })).toEqual({ ok: true, data: { done: true } });
    expect(await setChecklistItem({ businessId: me.businessId, key: "website", done: true })).toEqual({ ok: true, data: { done: true } });

    // What saveDrafts does on the next scan: open rows are replaced.
    await service.from("opportunities").delete().eq("business_id", me.businessId).eq("status", "open").throwOnError();
    const page = await getOpportunitiesPage(me.businessId);
    expect(page?.checklist?.items.filter((i) => i.done).map((i) => i.key)).toEqual(["website"]);
    expect(page?.items).toEqual([]);

    await setChecklistItem({ businessId: me.businessId, key: "website", done: false });
    const { data } = await service.from("opportunities").select("id").eq("business_id", me.businessId).throwOnError();
    expect(data).toEqual([]);
  });

  it("refuses another agency's business and opportunity", async () => {
    const owner = await seed();
    const other = await seed();
    session = other.client;
    const opportunityId = owner.opps[0].id;
    expect(await setOpportunityStatus({ businessId: owner.businessId, opportunityId, status: "dismissed" })).toMatchObject({ ok: false, status: 404 });
    expect(await setOpportunityStatus({ businessId: other.businessId, opportunityId, status: "dismissed" })).toMatchObject({ ok: false, status: 404 });
    expect(await setChecklistItem({ businessId: owner.businessId, key: "reviews", done: true })).toMatchObject({ ok: false, status: 404 });
    expect(await getOpportunitiesPage(owner.businessId)).toBeNull();
    const { data } = await service.from("opportunities").select("status").eq("id", opportunityId).single().throwOnError();
    expect(data.status).toBe("open");
  });

  it("rejects input that fails validation", async () => {
    const me = await seed();
    session = me.client;
    expect(await setOpportunityStatus({ businessId: me.businessId, opportunityId: me.opps[0].id, status: "resolved" })).toMatchObject({ ok: false, status: 400 });
    expect(await setChecklistItem({ businessId: me.businessId, key: "hack", done: true })).toMatchObject({ ok: false, status: 400 });
  });
});
