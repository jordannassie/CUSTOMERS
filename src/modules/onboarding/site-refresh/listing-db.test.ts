import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it, vi } from "vitest";
import { createServiceClient } from "@/lib/supabase/service";
import type { PlaceCandidate } from "../places";
import { relinkListing } from "./dal";

// BUG-158 against the local database: a missed listing is saved as its place ID only; a failure saves nothing.
const db = createServiceClient();
const userIds: string[] = [];
const ours: PlaceCandidate = {
  placeId: "ChIJ-test-relink-ours",
  name: "Advanced Plumbing",
  address: "1 Main St, Orange, CA",
  phone: "(714) 555-0100",
  primaryType: "plumber",
  types: ["plumber"],
  websiteUri: "https://advancedplumbing.example/",
  city: "Orange",
  state: "CA",
  country: "US",
  area: null,
};

async function business() {
  const { data, error } = await db.auth.admin.createUser({ email: `vitest-relink-${randomUUID()}@example.test`, email_confirm: true });
  if (error || !data.user) throw error ?? new Error("no user");
  userIds.push(data.user.id);
  const { data: agency } = await db.from("agencies").insert({ owner_user_id: data.user.id, name: "Relink test", is_test: true }).select("id").single().throwOnError();
  const { data: b } = await db
    .from("businesses")
    .insert({ owner_user_id: data.user.id, agency_id: agency.id, name: "Advanced Plumbing", domain: "advancedplumbing.example", status: "active" })
    .select("id")
    .single()
    .throwOnError();
  return b.id;
}
const row = async (id: string) => (await db.from("businesses").select("places_id, is_chain, name").eq("id", id).single().throwOnError()).data;

afterAll(async () => {
  for (const id of userIds) await db.auth.admin.deleteUser(id);
});

describe("relinkListing", () => {
  it("saves only the place ID of the listing that is this website", async () => {
    const id = await business();
    expect(await relinkListing(db, id, "advancedplumbing.example", async () => [ours])).toBe("linked");
    expect(await row(id)).toEqual({ places_id: ours.placeId, is_chain: false, name: "Advanced Plumbing" });
  });

  it("marks a chain and keeps no listing", async () => {
    const id = await business();
    const other = { ...ours, placeId: "ChIJ-test-relink-irvine", city: "Irvine" };
    expect(await relinkListing(db, id, "advancedplumbing.example", async () => [ours, other])).toBe("chain");
    expect(await row(id)).toMatchObject({ places_id: null, is_chain: true });
  });

  it("records a Google refusal once and saves nothing", async () => {
    const id = await business();
    const before = (await db.from("provider_errors").select("occurrences").eq("provider", "google_places").eq("kind", "rate_limit")).data ?? [];
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await relinkListing(db, id, "advancedplumbing.example", async () => Promise.reject(new Error("Places returned 429")))).toBe("failed");
    expect(await row(id)).toMatchObject({ places_id: null, is_chain: false });
    const after = (await db.from("provider_errors").select("occurrences").eq("provider", "google_places").eq("kind", "rate_limit")).data ?? [];
    const sum = (rows: { occurrences: number }[]) => rows.reduce((n, r) => n + r.occurrences, 0);
    expect(sum(after)).toBe(sum(before) + 1);
  });
});
