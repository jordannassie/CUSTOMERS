import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { createServiceClient } from "@/lib/supabase/service";
import { duplicateBusiness } from "./duplicates";

// Migration 067 against the local database: no second copy of a business in one agency, checked on the row written
// only, so rows saved before it (which may break the rules) still save their other columns.
const service = createServiceClient();
const userIds: string[] = [];

afterAll(async () => {
  for (const id of userIds.splice(0)) await service.auth.admin.deleteUser(id);
});

async function agency() {
  const { data, error } = await service.auth.admin.createUser({ email: `vitest-dupes-${randomUUID()}@example.test`, email_confirm: true });
  if (error || !data.user) throw error ?? new Error("no user");
  userIds.push(data.user.id);
  const a = await service.from("agencies").insert({ owner_user_id: data.user.id, name: "Dupes" }).select("id").single().throwOnError();
  return { userId: data.user.id, agencyId: a.data.id };
}

type Row = { name?: string; domain?: string | null; places_id?: string | null; status?: string; onboarding_step?: number | null; is_chain?: boolean; deleted_at?: string | null };
const add = (a: { userId: string; agencyId: string }, row: Row) =>
  service.from("businesses").insert({ owner_user_id: a.userId, agency_id: a.agencyId, name: "Sunrise Coffee", status: "active", ...row }).select("id").single();

describe("migration 067", () => {
  it("refuses the same website (any case), the same Google listing and a second setup draft in one agency", async () => {
    const a = await agency();
    await add(a, { domain: "sunrise-coffee.example", places_id: "ChIJ-dupe-1" }).throwOnError();
    await add(a, { status: "onboarding", onboarding_step: 4 }).throwOnError();

    const website = await add(a, { domain: "Sunrise-Coffee.EXAMPLE" });
    expect(website.error).toMatchObject({ code: "23505" });
    expect(duplicateBusiness(website.error)).toBe("website");
    expect(duplicateBusiness((await add(a, { places_id: "ChIJ-dupe-1" })).error)).toBe("listing");
    expect(duplicateBusiness((await add(a, { status: "onboarding", onboarding_step: 3 })).error)).toBe("draft");
    // A draft finished, and an update that moves a row onto another's website, are checked too.
    const other = await add(a, { domain: "other.example" }).throwOnError();
    const moved = await service.from("businesses").update({ domain: "sunrise-coffee.example" }).eq("id", other.data.id);
    expect(duplicateBusiness(moved.error)).toBe("website");
  });

  it("allows another agency, a deleted copy, a chain's branches, and rows with no setup step", async () => {
    const a = await agency();
    const b = await agency();
    await add(a, { domain: "kfc.example", is_chain: true, places_id: "ChIJ-branch-1" }).throwOnError();
    await add(b, { domain: "kfc.example", places_id: "ChIJ-branch-1" }).throwOnError();
    // Another branch of the chain: same website, its own listing.
    await add(a, { domain: "kfc.example", places_id: "ChIJ-branch-2" }).throwOnError();
    await add(a, { domain: "gone.example", deleted_at: new Date().toISOString() }).throwOnError();
    await add(a, { domain: "gone.example" }).throwOnError();
    // Test helpers and seeds insert with the column's default status and no step: not wizard drafts.
    await add(a, { status: "onboarding" }).throwOnError();
    await add(a, { status: "onboarding" }).throwOnError();
  });

  it("checks only the row being written: copies saved before it still save their other columns", async () => {
    const a = await agency();
    const first = await add(a, { domain: "twin.example" }).throwOnError();
    await service.rpc("soft_delete_business", { p_agency_id: a.agencyId, p_business_id: first.data.id, p_purge_after: new Date(Date.now() + 86_400_000).toISOString() }).throwOnError();
    await add(a, { domain: "twin.example" }).throwOnError();
    // Restoring the deleted copy would make two.
    const restored = await service.from("businesses").update({ deleted_at: null }).eq("id", first.data.id);
    expect(duplicateBusiness(restored.error)).toBe("website");

    // A pair that already breaks the rule (made here through the chain exception, then the flag cleared) still renames,
    // moves to another step and finishes setup.
    const chain = await add(a, { domain: "pair.example", is_chain: true }).throwOnError();
    const copy = await add(a, { domain: "pair.example", status: "onboarding", onboarding_step: 4 }).throwOnError();
    await service.from("businesses").update({ is_chain: false }).eq("id", chain.data.id).throwOnError();
    await service.from("businesses").update({ name: "Renamed", onboarding_step: 6 }).eq("id", copy.data.id).throwOnError();
    await service.from("businesses").update({ status: "active", onboarding_step: 9 }).eq("id", copy.data.id).throwOnError();
  });
});

describe("duplicateBusiness", () => {
  it("knows migration 067's refusals and nothing else", () => {
    expect(duplicateBusiness({ code: "23505", message: "duplicate_business: draft" })).toBe("draft");
    expect(duplicateBusiness({ code: "23505", message: "duplicate_business: Google listing ChIJ-x" })).toBe("listing");
    expect(duplicateBusiness({ code: "23505", message: 'duplicate key value violates unique constraint "business_competitors_unique_name"' })).toBeNull();
    expect(duplicateBusiness({ code: "42501", message: "duplicate_business: website a.example" })).toBeNull();
    expect(duplicateBusiness(null)).toBeNull();
  });
});
