import { randomUUID } from "node:crypto";
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, describe, expect, it, vi } from "vitest";
import { env } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/service";

// B-52 against the local database: status changes and checklist ticks only reach the agency's own
// business, and a ticked item survives the next scan's replacement of open opportunities.
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
const { getActionsExtras } = await import("./dal");
const { getActionsBoard } = await import("./board/dal");
const { findBranches } = await import("@/modules/onboarding/server");

async function seed(business: { name?: string; is_chain?: boolean; domain?: string } = {}) {
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
  const { data: row } = await service
    .from("businesses")
    .insert({ owner_user_id: data.user.id, agency_id: agency.id, name: "Nowhere Plumbing", status: "active", has_website: false, primary_city: "Springfield", ...business })
    .select("id")
    .single()
    .throwOnError();
  const { data: opps } = await service
    .from("opportunities")
    .insert([
      { business_id: row.id, title: "Low fix", impact: "low", category: "content", recommended_action: "1. One.\n2. Two." },
      { business_id: row.id, title: "High fix", impact: "high", category: "content", claude_prompt: "Write a page." },
    ])
    .select("id, title")
    .throwOnError();
  const client = createSupabaseClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  const signIn = await client.auth.signInWithPassword({ email, password });
  if (signIn.error) throw signIn.error;
  return { agencyId: agency.id, businessId: row.id, opps, client };
}

afterAll(async () => {
  for (const id of userIds) await service.auth.admin.deleteUser(id);
});

describe("opportunities against the database", () => {
  it("lists fixes by impact, shows the checklist, and changes status", async () => {
    const me = await seed();
    session = me.client;
    const board = await getActionsBoard(me.businessId);
    expect(board?.items.map((i) => i.title)).toEqual(["High fix", "Low fix"]);
    const extras = await getActionsExtras(me.businessId);
    expect(extras?.checklist?.missing).toEqual(["a website", "a Google Business Profile", "a phone number"]);
    expect(extras?.branch).toBeNull();

    const high = me.opps.find((o) => o.title === "High fix")!;
    expect(await setOpportunityStatus({ businessId: me.businessId, opportunityId: high.id, status: "done" })).toEqual({ ok: true, data: { status: "done" } });
    const { data } = await service.from("opportunities").select("status").eq("id", high.id).single().throwOnError();
    expect(data.status).toBe("resolved");
    expect((await getActionsBoard(me.businessId))?.items.find((i) => i.id === high.id)?.status).toBe("done");
  });

  it("ticks and unticks a checklist item, and a new scan does not remove the tick", async () => {
    const me = await seed();
    session = me.client;
    expect(await setChecklistItem({ businessId: me.businessId, key: "website", done: true })).toEqual({ ok: true, data: { done: true } });
    expect(await setChecklistItem({ businessId: me.businessId, key: "website", done: true })).toEqual({ ok: true, data: { done: true } });

    // What saveDrafts does on the next scan: open rows are replaced.
    await service.from("opportunities").delete().eq("business_id", me.businessId).eq("status", "open").throwOnError();
    const extras = await getActionsExtras(me.businessId);
    expect(extras?.checklist?.items.filter((i) => i.done).map((i) => i.key)).toEqual(["website"]);
    expect((await getActionsBoard(me.businessId))?.items).toEqual([]);

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
    expect(await getActionsExtras(owner.businessId)).toBeNull();
    expect(await getActionsBoard(owner.businessId)).toBeNull();
    const { data } = await service.from("opportunities").select("status").eq("id", opportunityId).single().throwOnError();
    expect(data.status).toBe("open");
  });

  it("offers a chain its branch to pick without searching Google on page load", async () => {
    const me = await seed({ name: "KFC", is_chain: true, domain: "kfcpakistan.com" });
    session = me.client;
    const extras = await getActionsExtras(me.businessId);
    expect(extras?.branch).toEqual({ query: "KFC Springfield", choices: [], unavailable: false, searched: false });
    // Its branch may still be picked, so no Google profile is missing yet and none is offered to claim.
    expect(extras?.checklist?.missing).not.toContain("a Google Business Profile");
    expect(extras?.checklist?.items.map((i) => i.key)).not.toContain("google_profile");
  });

  it("keeps a search that found no branch, so the claim step shows after a reload, until a search finds one", async () => {
    const me = await seed({ name: "KFC", is_chain: true, domain: "kfcpakistan.com" });
    session = me.client;
    const none = async () => [];
    expect(await findBranches(me.agencyId, me.businessId, "KFC Nowhere", none)).toMatchObject({ choices: [], unavailable: false, searched: true });
    const extras = await getActionsExtras(me.businessId);
    // The picker stays with the words searched, and the claim step is offered; no Google call on this read.
    expect(extras?.branch).toEqual({ query: "KFC Nowhere", choices: [], unavailable: false, searched: true });
    expect(extras?.checklist?.missing).toContain("a Google Business Profile");
    expect(extras?.checklist?.items.map((i) => i.key)).toContain("google_profile");
    // The saved search is not a fix on the board.
    expect((await getActionsBoard(me.businessId))?.items.map((i) => i.title)).toEqual(["High fix", "Low fix"]);

    // A search that finds a branch clears it.
    const branch = { placeId: "ChIJ-kfc-f7", name: "KFC F-7 Markaz", address: "F-7, Islamabad", phone: null, primaryType: null, types: [], websiteUri: null, city: null, state: null, country: null, area: null };
    await findBranches(me.agencyId, me.businessId, "KFC F-7", async () => [branch]);
    expect((await getActionsExtras(me.businessId))?.checklist?.items.map((i) => i.key)).not.toContain("google_profile");
  });

  it("rejects input that fails validation", async () => {
    const me = await seed();
    session = me.client;
    expect(await setOpportunityStatus({ businessId: me.businessId, opportunityId: me.opps[0].id, status: "resolved" })).toMatchObject({ ok: false, status: 400 });
    expect(await setChecklistItem({ businessId: me.businessId, key: "hack", done: true })).toMatchObject({ ok: false, status: 400 });
  });
});
