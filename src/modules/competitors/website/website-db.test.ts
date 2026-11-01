import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { createServiceClient } from "@/lib/supabase/service";
import { saveCompetitorWebsite } from "./dal";

// "Add website" against the local database: only the agency's own competitor gets it, as the user's domain.
const db = createServiceClient();
const userIds: string[] = [];

async function agencyWithCompetitor() {
  const { data, error } = await db.auth.admin.createUser({ email: `vitest-site-${randomUUID()}@example.test`, email_confirm: true });
  if (error || !data.user) throw error ?? new Error("no user");
  userIds.push(data.user.id);
  const { data: agency } = await db.from("agencies").insert({ owner_user_id: data.user.id, name: "Website test", is_test: true }).select("id").single().throwOnError();
  const { data: business } = await db
    .from("businesses")
    .insert({ owner_user_id: data.user.id, agency_id: agency.id, name: "Sunrise Coffee", domain: "sunrise.example", primary_city: "Islamabad", status: "active" })
    .select("id")
    .single()
    .throwOnError();
  const { data: competitor } = await db
    .from("business_competitors")
    .insert({ business_id: business.id, name: "Burning Brownie", places_id: "ChIJ-test-burning-brownie", source: "confirmed_place", confirmed: true })
    .select("id")
    .single()
    .throwOnError();
  return { agencyId: agency.id, businessId: business.id, competitorId: competitor.id };
}
const domainOf = async (id: string) => (await db.from("business_competitors").select("domain, places_id, phone").eq("id", id).single().throwOnError()).data;

afterAll(async () => {
  for (const id of userIds) await db.auth.admin.deleteUser(id);
});

describe("saveCompetitorWebsite", () => {
  it("saves the typed website as the competitor's domain, and nothing else", async () => {
    const a = await agencyWithCompetitor();
    expect(await saveCompetitorWebsite(a.agencyId, a.businessId, a.competitorId, "burningbrownie.com")).toEqual({ ok: true, domain: "burningbrownie.com" });
    expect(await domainOf(a.competitorId)).toEqual({ domain: "burningbrownie.com", places_id: "ChIJ-test-burning-brownie", phone: null });
    expect(await saveCompetitorWebsite(a.agencyId, a.businessId, a.competitorId, null)).toEqual({ ok: true, domain: null });
    expect((await domainOf(a.competitorId)).domain).toBeNull();
  });

  it("refuses another agency's business or competitor", async () => {
    const mine = await agencyWithCompetitor();
    const theirs = await agencyWithCompetitor();
    expect(await saveCompetitorWebsite(mine.agencyId, theirs.businessId, theirs.competitorId, "x.com")).toMatchObject({ ok: false, status: 404 });
    expect(await saveCompetitorWebsite(mine.agencyId, mine.businessId, theirs.competitorId, "x.com")).toMatchObject({ ok: false, status: 404 });
    expect((await domainOf(theirs.competitorId)).domain).toBeNull();
  });
});
