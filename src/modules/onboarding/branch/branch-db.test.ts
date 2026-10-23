import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { createServiceClient } from "@/lib/supabase/service";
import type { PlaceCandidate } from "../places";
import { findBranches, saveBranch } from "./dal";

// Step 6d against the local database: the branch search reaches only the agency's own chain, and a pick writes
// only its place_id.
const service = createServiceClient();
const userIds: string[] = [];

const KFC_F7: PlaceCandidate = {
  placeId: "ChIJ-test-kfc-f7-markaz",
  name: "KFC F-7 Markaz",
  address: "Jinnah Super, F-7 Markaz, Islamabad",
  phone: "+92 51 111 532 532",
  primaryType: "fast_food_restaurant",
  types: ["fast_food_restaurant"],
  websiteUri: "https://www.kfcpakistan.com/",
  city: "Islamabad",
  state: null,
  country: "PK",
  area: "F-7",
};

async function seedAgency(chain: boolean) {
  const { data, error } = await service.auth.admin.createUser({ email: `vitest-branch-${randomUUID()}@example.test`, email_confirm: true });
  if (error || !data.user) throw error ?? new Error("no user");
  userIds.push(data.user.id);
  const { data: agency } = await service.from("agencies").insert({ owner_user_id: data.user.id, name: "Branch test", is_test: true }).select("id").single().throwOnError();
  const { data: business } = await service
    .from("businesses")
    .insert({ owner_user_id: data.user.id, agency_id: agency.id, name: "KFC", domain: "kfcpakistan.com", primary_city: "Islamabad", status: "active", is_chain: chain })
    .select("id")
    .single()
    .throwOnError();
  return { agencyId: agency.id, businessId: business.id };
}

const placesIdOf = async (businessId: string) =>
  (await service.from("businesses").select("places_id").eq("id", businessId).single().throwOnError()).data.places_id;

afterAll(async () => {
  for (const id of userIds) await service.auth.admin.deleteUser(id);
});

describe("pick your branch on Google, against the database (step 6d)", () => {
  it("searches the chain's name and city, and saves only the picked place_id for the agency's own business", async () => {
    const own = await seedAgency(true);
    const other = await seedAgency(true);
    const queries: string[] = [];
    const search = async (q: string) => {
      queries.push(q);
      return [KFC_F7];
    };

    expect(await findBranches(own.agencyId, own.businessId, undefined, search)).toEqual({
      query: "KFC Islamabad",
      choices: [{ placeId: KFC_F7.placeId, name: KFC_F7.name, address: KFC_F7.address }],
      unavailable: false,
    });
    expect(await findBranches(other.agencyId, own.businessId, undefined, search)).toBeNull();
    expect(queries).toEqual(["KFC Islamabad"]);

    expect(await saveBranch(other.agencyId, own.businessId, KFC_F7.placeId)).toBe(false);
    expect(await placesIdOf(own.businessId)).toBeNull();
    expect(await saveBranch(own.agencyId, own.businessId, KFC_F7.placeId)).toBe(true);
    expect(await placesIdOf(own.businessId)).toBe(KFC_F7.placeId);
    // Picked: no more search.
    expect(await findBranches(own.agencyId, own.businessId, undefined, search)).toBeNull();
  });

  it("is not offered to a single shop, and Google failing reads as unavailable, not as no branch", async () => {
    const single = await seedAgency(false);
    const failing = async (): Promise<PlaceCandidate[]> => {
      throw new Error("Places returned 429");
    };
    expect(await findBranches(single.agencyId, single.businessId, undefined, failing)).toBeNull();
    const chain = await seedAgency(true);
    const found = await findBranches(chain.agencyId, chain.businessId, "KFC F-7", failing);
    expect(found).toEqual({ query: "KFC F-7", choices: [], unavailable: true });
  });
});
