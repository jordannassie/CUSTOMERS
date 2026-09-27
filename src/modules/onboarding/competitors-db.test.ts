import { randomUUID } from "node:crypto";
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { env } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/service";
import { fakeCompetitorPlaces, LOOKUP_CANDIDATES, NEARBY_CANDIDATES } from "./competitor-fixtures";

// B-35 against the local database: the actions' checks, the plan limit, and what gets stored (D-73).
const service = createServiceClient();
const userIds: string[] = [];

let session: SupabaseClient | null = null;

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () =>
    session ??
    createSupabaseClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
    }),
}));

const { lookupCompetitorByName, saveCompetitorList } = await import("./actions");
const { loadCompetitorStep, lookupCompetitor } = await import("./dal");

async function createOwner(plan?: "pro") {
  const email = `vitest-competitors-${randomUUID()}@example.test`;
  const password = `pw-${randomUUID()}`;
  const { data, error } = await service.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) throw error ?? new Error("no user");
  userIds.push(data.user.id);
  const agency = await service
    .from("agencies")
    .insert({ owner_user_id: data.user.id, name: "Competitor test", is_test: true })
    .select("id")
    .single();
  if (agency.error) throw agency.error;
  const business = await service
    .from("businesses")
    .insert({
      owner_user_id: data.user.id,
      agency_id: agency.data.id,
      name: "Sunrise Coffee Bar",
      industry: "coffee_shop",
      primary_city: "Springfield",
      primary_region: "IL",
    })
    .select("id")
    .single();
  if (business.error) throw business.error;
  if (plan) {
    const sub = await service
      .from("business_subscriptions")
      .insert({ business_id: business.data.id, agency_id: agency.data.id, plan_id: plan });
    if (sub.error) throw sub.error;
  }
  const client = createSupabaseClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  });
  const signIn = await client.auth.signInWithPassword({ email, password });
  if (signIn.error) throw signIn.error;
  return { userId: data.user.id, businessId: business.data.id, client };
}

async function storedRows(businessId: string) {
  const { data, error } = await service.from("business_competitors").select(
      "id, name, places_id, source, confirmed, place_id, formatted_address, city, region, country, latitude, longitude, category, phone, domain",
    )
    .eq("business_id", businessId).order("name");
  if (error) throw error;
  return data;
}

const pick = (n: number) => NEARBY_CANDIDATES.filter((c) => c.name !== "Sunrise Coffee Bar").slice(0, n);
const asInput = (list: typeof NEARBY_CANDIDATES) => list.map((c) => ({ name: c.name, placesId: c.placeId }));

beforeEach(() => {
  session = null;
});
afterAll(async () => {
  for (const id of userIds.splice(0)) await service.auth.admin.deleteUser(id);
});

describe("competitor actions", () => {
  it("return 401 without a session", async () => {
    const businessId = randomUUID();
    expect(await saveCompetitorList({ businessId, competitors: [] })).toMatchObject({ ok: false, status: 401 });
    expect(await lookupCompetitorByName({ businessId, name: "Blue Door" })).toMatchObject({ ok: false, status: 401 });
  });

  it("reject bad input and someone else's business", async () => {
    const mine = await createOwner();
    const theirs = await createOwner();
    session = mine.client;

    expect(await saveCompetitorList({ businessId: mine.businessId, competitors: [{ name: "X", placesId: "../evil" }] })).toMatchObject({
      ok: false,
      status: 400,
    });
    expect(await lookupCompetitorByName({ businessId: mine.businessId, name: "B" })).toMatchObject({ ok: false, status: 400 });
    expect(await saveCompetitorList({ businessId: theirs.businessId, competitors: asInput(pick(1)) })).toEqual({
      ok: false,
      status: 404,
      error: "Business not found.",
    });
    expect(await storedRows(theirs.businessId)).toEqual([]);
  });
});

describe("saving competitors", () => {
  it("stores only the confirmed names and place ids, never Places ratings, reviews or addresses", async () => {
    const owner = await createOwner();
    session = owner.client;
    const chosen = pick(3);

    const result = await saveCompetitorList({
      businessId: owner.businessId,
      competitors: [...asInput(chosen), { name: "Blue Door Coffee", placesId: null }],
    });
    expect(result).toEqual({ ok: true, data: { count: 4 } });

    const rows = await storedRows(owner.businessId);
    expect(rows.map((r) => [r.name, r.places_id, r.source, r.confirmed])).toEqual(
      [
        ...chosen.map((c) => [c.name, c.placeId, "confirmed_place", true]),
        ["Blue Door Coffee", null, "manual", true],
      ].sort((a, b) => String(a[0]).localeCompare(String(b[0]))),
    );
    for (const row of rows) {
      expect(row).toMatchObject({
        place_id: null,
        formatted_address: null,
        city: null,
        region: null,
        country: null,
        latitude: null,
        longitude: null,
        category: null,
        phone: null,
      });
    }
    const everything = JSON.stringify(rows);
    for (const c of chosen) {
      expect(everything).not.toContain(c.address!);
      expect(everything).not.toContain(c.mapsUri!);
    }
  });

  it("stops a sixth competitor on Starter and allows ten on Pro", async () => {
    const starter = await createOwner();
    session = starter.client;
    expect(await saveCompetitorList({ businessId: starter.businessId, competitors: asInput(pick(6)) })).toEqual({
      ok: false,
      status: 403,
      error: "Your plan tracks up to 5 competitors.",
    });
    expect(await storedRows(starter.businessId)).toEqual([]);
    expect(await saveCompetitorList({ businessId: starter.businessId, competitors: asInput(pick(5)) })).toMatchObject({ ok: true });

    const pro = await createOwner("pro");
    session = pro.client;
    const ten = [...pick(10), ...LOOKUP_CANDIDATES].slice(0, 10);
    expect(await saveCompetitorList({ businessId: pro.businessId, competitors: asInput(ten) })).toEqual({ ok: true, data: { count: 10 } });
    expect(await saveCompetitorList({ businessId: pro.businessId, competitors: asInput([...ten, LOOKUP_CANDIDATES[1]]) })).toMatchObject({
      ok: false,
      error: "Your plan tracks up to 10 competitors.",
    });
  });

  it("replaces the list, keeping rows the user left in and clearing old Places copies", async () => {
    const owner = await createOwner();
    session = owner.client;
    const [bean, grind] = pick(2);
    const legacy = await service
      .from("business_competitors")
      .insert({ business_id: owner.businessId, name: bean.name, source: "google_places", formatted_address: bean.address, phone: "(217) 555-0100", category: "cafe" })
      .select("id")
      .single();
    if (legacy.error) throw legacy.error;
    await service.from("business_competitors").insert({ business_id: owner.businessId, name: "Old Rival" });

    expect(await saveCompetitorList({ businessId: owner.businessId, competitors: asInput([bean, grind]) })).toMatchObject({ ok: true });

    const rows = await storedRows(owner.businessId);
    expect(rows.map((r) => r.name)).toEqual([bean.name, grind.name]);
    const kept = rows.find((r) => r.name === bean.name)!;
    expect(kept).toMatchObject({ id: legacy.data.id, places_id: bean.placeId, formatted_address: null, phone: null, category: null });
  });
});

describe("loading the step", () => {
  it("shows live Places values for saved competitors without writing them", async () => {
    const owner = await createOwner();
    session = owner.client;
    const [bean] = pick(1);
    await saveCompetitorList({ businessId: owner.businessId, competitors: [...asInput([bean]), { name: "Kiln", placesId: null }] });
    const before = await storedRows(owner.businessId);
    const { places, calls } = fakeCompetitorPlaces();

    const step = await loadCompetitorStep(owner.userId, owner.businessId, places);
    expect(step).toMatchObject({ businessName: "Sunrise Coffee Bar", limit: 5, note: null });
    expect(step?.suggestions).toHaveLength(10);
    expect(step?.saved).toEqual([
      { name: bean.name, placesId: bean.placeId, live: bean },
      { name: "Kiln", placesId: null, live: null },
    ]);
    expect(calls.details).toEqual([bean.placeId]);
    expect(await storedRows(owner.businessId)).toEqual(before);

    const other = await createOwner();
    expect(await loadCompetitorStep(owner.userId, other.businessId, places)).toBeNull();
  });

  it("looks a name up near the business, and says so when Places is down", async () => {
    const owner = await createOwner();
    session = owner.client;
    const { places, calls } = fakeCompetitorPlaces();
    expect(await lookupCompetitor(owner.userId, owner.businessId, "Blue Door", places)).toEqual({ matches: LOOKUP_CANDIDATES, note: null });
    expect(calls.search).toEqual(["Blue Door in Springfield, IL"]);

    const down = fakeCompetitorPlaces(new Error("timeout"));
    expect(await lookupCompetitor(owner.userId, owner.businessId, "Blue Door", down.places)).toMatchObject({ matches: [] });
  });
});
