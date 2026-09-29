import { randomUUID } from "node:crypto";
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { env } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/service";

// B-59 against the local database: creating and turning off share links, and what the public report holds.
// Google values from the made-up fixtures, never a real Places call (D-73).
vi.hoisted(() => vi.stubEnv("PLACES_FIXTURES", "true"));

const service = createServiceClient();
const userIds: string[] = [];
let session: SupabaseClient | null = null;

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () =>
    session ??
    createSupabaseClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } }),
}));

const { createShareLink, revokeShareLink } = await import("./actions");
const { getSharedReport } = await import("./dal");

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

async function createOwner() {
  const email = `vitest-reports-${randomUUID()}@example.test`;
  const password = `pw-${randomUUID()}`;
  const { data, error } = await service.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) throw error ?? new Error("no user");
  userIds.push(data.user.id);
  const { data: agency } = await service
    .from("agencies")
    .insert({ owner_user_id: data.user.id, name: "Northside Marketing", is_test: true, status: "active" })
    .select("id")
    .single()
    .throwOnError();
  const { data: business } = await service
    .from("businesses")
    .insert({
      owner_user_id: data.user.id,
      agency_id: agency.id,
      name: "Sunrise Coffee Bar",
      status: "active",
      industry: "coffee_shop",
      primary_city: "Springfield",
      primary_region: "IL",
      places_id: "ChIJ-fixture-sunrise-coffee",
      models: ["openai", "anthropic", "perplexity"],
    })
    .select("id")
    .single()
    .throwOnError();
  await service
    .from("business_competitors")
    .insert({ business_id: business.id, name: "Bean House", places_id: "ChIJ-fixture-bean-house", source: "confirmed_place", confirmed: true, created_at: new Date(Date.now() - 2 * 86_400_000).toISOString() })
    .throwOnError();
  await service
    .from("opportunities")
    .insert({ business_id: business.id, title: "Add your opening hours to your website", impact: "high", status: "open", category: "local_presence" })
    .throwOnError();
  const { data: run } = await service
    .from("visibility_runs")
    .insert({ business_id: business.id, provider: "scan", status: "completed" })
    .select("id")
    .single()
    .throwOnError();
  await service
    .from("visibility_results")
    .insert(
      [0, 1, 2].map((i) => ({
        run_id: run.id,
        business_id: business.id,
        provider: ["openai", "anthropic", "perplexity"][i],
        created_at: new Date(Date.now() - 3_600_000).toISOString(),
        business_mentioned: i !== 1,
        competitors_mentioned: [{ name: "Bean House", position: 1 }],
        cached: false,
        answer_text: `answer ${i}`,
      })),
    )
    .throwOnError();
  const client = createSupabaseClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  const signIn = await client.auth.signInWithPassword({ email, password });
  if (signIn.error) throw signIn.error;
  return { agencyId: agency.id, businessId: business.id, userId: data.user.id, client };
}

const tokenOf = (path: string) => path.replace(/^\/r\//, "");

beforeEach(() => {
  session = null;
});
afterAll(async () => {
  for (const id of userIds.splice(0)) await service.auth.admin.deleteUser(id);
});

describe("share links", () => {
  it("need a session", async () => {
    expect(await createShareLink({ businessId: randomUUID() })).toMatchObject({ ok: false, status: 401 });
    expect(await revokeShareLink({ id: randomUUID() })).toMatchObject({ ok: false, status: 401 });
  });

  it("creates one long random link, reuses it, and turns it off", async () => {
    const owner = await createOwner();
    session = owner.client;
    const first = await createShareLink({ businessId: owner.businessId });
    const again = await createShareLink({ businessId: owner.businessId });
    if (!first.ok || !again.ok) throw new Error("create failed");
    expect(again.data).toEqual(first.data);
    expect(tokenOf(first.data.path)).toMatch(/^[A-Za-z0-9_-]{43}$/);

    const report = await getSharedReport(tokenOf(first.data.path));
    expect(report).toMatchObject({ businessName: "Sunrise Coffee Bar", agency: { name: "Northside Marketing", hasLogo: false } });
    expect(report!.score?.value).toBe(67);
    expect(report!.opportunities).toEqual([{ title: "Add your opening hours to your website", impact: "high" }]);
    expect(report!.competitors.signals.find((s) => s.name === "Bean House")?.signals).toMatchObject({ reviewCount: 320 });

    expect(await revokeShareLink({ id: first.data.id })).toEqual({ ok: true, data: null });
    expect(await getSharedReport(tokenOf(first.data.path))).toBeNull();
    const next = await createShareLink({ businessId: owner.businessId });
    if (!next.ok) throw new Error("create failed");
    expect(next.data.path).not.toBe(first.data.path);
  });

  it("puts no database ids, emails or place ids in the report", async () => {
    const owner = await createOwner();
    session = owner.client;
    const link = await createShareLink({ businessId: owner.businessId });
    if (!link.ok) throw new Error("create failed");
    const json = JSON.stringify(await getSharedReport(tokenOf(link.data.path)));
    expect(json).not.toMatch(UUID);
    expect(json).not.toMatch(/@example\.test|ChIJ-/);
  });

  it("refuses another agency's business and link", async () => {
    const [owner, other] = await Promise.all([createOwner(), createOwner()]);
    session = other.client;
    const theirs = await createShareLink({ businessId: other.businessId });
    if (!theirs.ok) throw new Error("create failed");

    session = owner.client;
    expect(await createShareLink({ businessId: other.businessId })).toMatchObject({ ok: false, status: 404 });
    expect(await revokeShareLink({ id: theirs.data.id })).toMatchObject({ ok: false, status: 404 });
    expect(await getSharedReport(tokenOf(theirs.data.path))).not.toBeNull();
    expect(await createShareLink({ businessId: "not-a-uuid" })).toMatchObject({ ok: false, status: 400 });
  });

  it("turns off every live link for the business, even one made by a racing double click", async () => {
    const owner = await createOwner();
    session = owner.client;
    const stray = "s".repeat(43);
    await service.from("report_shares").insert({ business_id: owner.businessId, token: stray }).throwOnError();
    const link = await createShareLink({ businessId: owner.businessId });
    if (!link.ok) throw new Error("create failed");
    expect(await revokeShareLink({ id: link.data.id })).toMatchObject({ ok: true });
    expect(await getSharedReport(stray)).toBeNull();
    expect(await getSharedReport(tokenOf(link.data.path))).toBeNull();
  });

  it("shows nothing for unknown or malformed tokens", async () => {
    expect(await getSharedReport("A".repeat(43))).toBeNull();
    expect(await getSharedReport("' or 1=1 --")).toBeNull();
  });

  it("keeps links out of reach of signed-in users through the API (no public policies)", async () => {
    const [owner, other] = await Promise.all([createOwner(), createOwner()]);
    session = owner.client;
    const link = await createShareLink({ businessId: owner.businessId });
    if (!link.ok) throw new Error("create failed");
    const anon = createSupabaseClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
    expect((await anon.from("report_shares").select("token")).data ?? []).toEqual([]);
    expect((await other.client.from("report_shares").select("token")).data).toEqual([]);
    const insert = await other.client.from("report_shares").insert({ business_id: owner.businessId, token: "x".repeat(43) });
    expect(insert.error).not.toBeNull();
  });
});
