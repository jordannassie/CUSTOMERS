import { randomUUID } from "node:crypto";
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { env } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/service";
import { AUSTIN_CANDIDATE, DALLAS_CANDIDATE, fakeCompetitorPlaces } from "../competitor-fixtures";
import { PlacesError } from "../places";

// Competitors follow the business's location (2026-10-16), against the local database: Austin to Dallas removes the
// Austin pick, keeps the Dallas pick and the one added by name (flagged), and keeps everything when Places fails.
const service = createServiceClient();
const userIds: string[] = [];
let session: SupabaseClient | null = null;
const recounts = vi.hoisted(() => [] as string[]);

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => session!,
}));
vi.mock("@/modules/scanning", async (original) => ({
  ...(await original<typeof import("@/modules/scanning")>()),
  recountAfterNamesChange: async (businessId: string) => void recounts.push(businessId),
}));

const { keepCompetitorsNear, savedLocation } = await import("./dal");
const { loadCompetitorStep, saveCompetitors } = await import("../competitor-step/dal");

const TYPED = "Corner Cafe";

async function austinBusiness() {
  const email = `vitest-competitor-location-${randomUUID()}@example.test`;
  const password = `pw-${randomUUID()}`;
  const { data, error } = await service.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) throw error ?? new Error("no user");
  userIds.push(data.user.id);
  const agency = await service.from("agencies").insert({ owner_user_id: data.user.id, name: "Location test", is_test: true }).select("id").single().throwOnError();
  const business = await service
    .from("businesses")
    .insert({
      owner_user_id: data.user.id,
      agency_id: agency.data.id,
      name: "Sunrise Coffee Bar",
      industry: "coffee_shop",
      primary_city: "Austin",
      primary_region: "TX",
      primary_country: "US",
    })
    .select("id")
    .single()
    .throwOnError();
  const businessId = business.data.id;
  const added = (minutesAgo: number) => new Date(Date.now() - minutesAgo * 60_000).toISOString();
  await service
    .from("business_competitors")
    .insert([
      { business_id: businessId, name: AUSTIN_CANDIDATE.name, places_id: AUSTIN_CANDIDATE.placeId, source: "confirmed_place", confirmed: true, created_at: added(3) },
      { business_id: businessId, name: DALLAS_CANDIDATE.name, places_id: DALLAS_CANDIDATE.placeId, source: "confirmed_place", confirmed: true, created_at: added(2) },
      { business_id: businessId, name: TYPED, places_id: null, source: "manual", confirmed: true, created_at: added(1) },
    ])
    .throwOnError();
  const client = createSupabaseClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  const signIn = await client.auth.signInWithPassword({ email, password });
  if (signIn.error) throw signIn.error;
  session = client;
  return { userId: data.user.id, businessId };
}

async function moveTo(businessId: string, city: string, region = "TX") {
  await service.from("businesses").update({ primary_city: city, primary_region: region }).eq("id", businessId).throwOnError();
}

const names = async (businessId: string) =>
  ((await service.from("business_competitors").select("name").eq("business_id", businessId).order("name").throwOnError()).data ?? []).map((r) => r.name);

beforeEach(() => {
  recounts.length = 0;
});
afterAll(async () => {
  for (const id of userIds.splice(0)) await service.auth.admin.deleteUser(id);
});

describe("moving from Austin to Dallas", () => {
  it("removes the Austin pick, keeps the Dallas pick and flags the typed one, with one Places call per pick", async () => {
    const { userId, businessId } = await austinBusiness();
    const before = await savedLocation(businessId);
    expect(before).toEqual({ city: "Austin", region: "TX", country: "US" });
    await moveTo(businessId, "Dallas");
    const { places, calls } = fakeCompetitorPlaces();

    expect(await keepCompetitorsNear(businessId, before, { places })).toEqual({ removed: 1 });
    expect(calls.area.sort()).toEqual([AUSTIN_CANDIDATE.placeId, DALLAS_CANDIDATE.placeId].sort());
    expect(calls.details).toEqual([]);
    expect(await names(businessId)).toEqual([TYPED, DALLAS_CANDIDATE.name]);
    expect(recounts).toEqual([businessId]);

    // The competitor step says so once, flags the typed one, and searches near Dallas.
    const step = await loadCompetitorStep(userId, businessId, places);
    expect(step?.locationNote).toBe("We removed 1 competitor from Austin. The suggestions below are near Dallas.");
    expect(step?.saved.map((c) => [c.name, c.checkNear])).toEqual([
      [DALLAS_CANDIDATE.name, undefined],
      [TYPED, "Added by name: check it is near Dallas"],
    ]);
    expect(calls.search.at(-1)).toBe("coffee shop in Dallas, TX");

    // Saving the list confirms it for Dallas: the note and the flag go.
    const saved = await saveCompetitors(userId, businessId, [
      { name: DALLAS_CANDIDATE.name, placesId: DALLAS_CANDIDATE.placeId },
      { name: TYPED, placesId: null },
    ]);
    expect(saved).toEqual({ ok: true, count: 2 });
    const after = await loadCompetitorStep(userId, businessId, places);
    expect(after?.locationNote).toBeNull();
    expect(after?.saved.some((c) => c.checkNear)).toBe(false);
  });

  it("keeps every competitor when Places fails, still flagging the typed one", async () => {
    const { userId, businessId } = await austinBusiness();
    const before = await savedLocation(businessId);
    await moveTo(businessId, "Dallas");
    const { places, calls } = fakeCompetitorPlaces(new PlacesError("Places returned 503"));

    expect(await keepCompetitorsNear(businessId, before, { places })).toEqual({ removed: 0 });
    expect(calls.area).toHaveLength(2);
    expect(await names(businessId)).toEqual([AUSTIN_CANDIDATE.name, TYPED, DALLAS_CANDIDATE.name]);
    expect(recounts).toEqual([]);
    const step = await loadCompetitorStep(userId, businessId, fakeCompetitorPlaces().places);
    expect(step?.locationNote).toBeNull();
    expect(step?.saved.find((c) => c.name === TYPED)?.checkNear).toBe("Added by name: check it is near Dallas");
  });

  it("does nothing when the city, region and country stay the same, and adds up two moves", async () => {
    const { userId, businessId } = await austinBusiness();
    const { places, calls } = fakeCompetitorPlaces();
    const same = await savedLocation(businessId);
    await service.from("businesses").update({ primary_area: "Downtown", primary_region: "tx" }).eq("id", businessId).throwOnError();
    expect(await keepCompetitorsNear(businessId, same, { places })).toEqual({ removed: 0 });
    expect(calls.area).toEqual([]);
    const flags = await service.from("businesses").select("location_changed_at, competitors_removed").eq("id", businessId).single().throwOnError();
    expect(flags.data).toEqual({ location_changed_at: null, competitors_removed: null });

    // Austin to Dallas removes the Austin pick; Dallas to Houston then removes the Dallas one.
    await moveTo(businessId, "Dallas");
    expect(await keepCompetitorsNear(businessId, same, { places })).toEqual({ removed: 1 });
    const inDallas = await savedLocation(businessId);
    await moveTo(businessId, "Houston");
    expect(await keepCompetitorsNear(businessId, inDallas, { places })).toEqual({ removed: 1 });
    expect(await names(businessId)).toEqual([TYPED]);
    const step = await loadCompetitorStep(userId, businessId, places);
    expect(step?.locationNote).toBe("We removed 2 competitors from Austin and Dallas. The suggestions below are near Houston.");
  });
});
