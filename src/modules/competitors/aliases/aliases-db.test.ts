import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { createServiceClient } from "@/lib/supabase/service";
import { loadCompetitorAliases, saveCompetitorAliases } from "./dal";

// Other names for competitors (migration 055) against the local database: only the agency's own business, the names
// are saved, and saved answers are checked again so the competitor counts at once.
const service = createServiceClient();
const userIds: string[] = [];
afterAll(async () => {
  for (const id of userIds.splice(0)) await service.auth.admin.deleteUser(id);
});

async function setUp() {
  const { data, error } = await service.auth.admin.createUser({ email: `vitest-aliases-${randomUUID()}@example.test`, password: `pw-${randomUUID()}`, email_confirm: true });
  if (error || !data.user) throw error ?? new Error("no user");
  userIds.push(data.user.id);
  const { data: agency } = await service.from("agencies").insert({ owner_user_id: data.user.id, name: "Aliases test", is_test: true }).select("id").single().throwOnError();
  const { data: business } = await service
    .from("businesses")
    .insert({ owner_user_id: data.user.id, agency_id: agency.id, name: "Howdy", status: "active", primary_city: "Islamabad" })
    .select("id")
    .single()
    .throwOnError();
  const { data: rival } = await service.from("business_competitors").insert({ business_id: business.id, name: "Kentucky Fried Chicken" }).select("id").single().throwOnError();
  const { data: run } = await service.from("visibility_runs").insert({ business_id: business.id, provider: "scan", status: "completed" }).select("id").single().throwOnError();
  const resultId = randomUUID();
  await service
    .from("visibility_results")
    .insert({ id: resultId, run_id: run.id, business_id: business.id, provider: "openai", business_mentioned: false, competitors_mentioned: [], answer_text: "1. **KFC** in Blue Area\n2. **Howdy** in F-7" })
    .throwOnError();
  return { agencyId: agency.id, businessId: business.id, rivalId: rival.id, resultId };
}

const counted = async (resultId: string) =>
  (await service.from("visibility_results").select("competitors_mentioned").eq("id", resultId).single().throwOnError()).data.competitors_mentioned;

describe("competitor other names", () => {
  it("saves them, counts saved answers that use them, and stops counting once removed", async () => {
    const t = await setUp();
    expect(await counted(t.resultId)).toEqual([]);

    expect(await saveCompetitorAliases(t.agencyId, t.businessId, [{ id: t.rivalId, aliases: ["KFC", "Kentucky Fried Chicken"] }])).toEqual({ ok: true, changed: 1 });
    // Its own name is dropped: it is looked for anyway.
    expect(await loadCompetitorAliases(t.agencyId, t.businessId)).toEqual([{ id: t.rivalId, name: "Kentucky Fried Chicken", aliases: ["KFC"] }]);
    expect(await counted(t.resultId)).toEqual([{ name: "Kentucky Fried Chicken", position: 1 }]);

    // The same names again in another order change nothing.
    expect(await saveCompetitorAliases(t.agencyId, t.businessId, [{ id: t.rivalId, aliases: ["kfc"] }])).toEqual({ ok: true, changed: 0 });

    expect(await saveCompetitorAliases(t.agencyId, t.businessId, [{ id: t.rivalId, aliases: [] }])).toEqual({ ok: true, changed: 1 });
    expect(await counted(t.resultId)).toEqual([]);
  });

  it("refuses another agency's business and ignores a competitor that is not the business's", async () => {
    const mine = await setUp();
    const theirs = await setUp();
    expect(await loadCompetitorAliases(mine.agencyId, theirs.businessId)).toBeNull();
    expect(await saveCompetitorAliases(mine.agencyId, theirs.businessId, [{ id: theirs.rivalId, aliases: ["KFC"] }])).toMatchObject({ ok: false, status: 404 });
    expect(await saveCompetitorAliases(mine.agencyId, mine.businessId, [{ id: theirs.rivalId, aliases: ["KFC"] }])).toEqual({ ok: true, changed: 0 });
    const { data } = await service.from("business_competitors").select("aliases").eq("id", theirs.rivalId).single().throwOnError();
    expect(data.aliases).toEqual([]);
  });

  it("holds at most 10 other names per competitor in the database too", async () => {
    const t = await setUp();
    const eleven = Array.from({ length: 11 }, (_, i) => `Name ${i}`);
    const { error } = await service.from("business_competitors").update({ aliases: eleven }).eq("id", t.rivalId);
    expect(error?.message).toMatch(/business_competitors_aliases_count/);
  });
});
