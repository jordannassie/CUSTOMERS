// A new industry rebuilds the suggested questions, against the local database: the old suggestions are retired (kept
// for past results), the user's own questions stay, and nothing happens before the first set exists.
import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { createServiceClient } from "@/lib/supabase/service";
import { COFFEE_FULL_BUSINESS, COFFEE_GOOD_PICK, COFFEE_LIBRARY, fakeQuestionClients } from "../../../question-fixtures";
import { rebuildQuestionsForIndustry, sameIndustry } from "./dal";

const service = createServiceClient();
const userIds: string[] = [];

afterAll(async () => {
  for (const id of userIds) await service.auth.admin.deleteUser(id);
});

async function seedBusiness(industry: string) {
  const { data: user, error } = await service.auth.admin.createUser({ email: `vitest-rebuild-${randomUUID()}@example.test`, password: randomUUID(), email_confirm: true });
  if (error) throw error;
  userIds.push(user.user.id);
  const agency = await service.from("agencies").insert({ owner_user_id: user.user.id, name: "Rebuild test" }).select("id").single().throwOnError();
  const biz = await service
    .from("businesses")
    .insert({
      owner_user_id: user.user.id,
      agency_id: agency.data.id,
      name: "Sunrise",
      industry,
      services: COFFEE_FULL_BUSINESS.services,
      description: COFFEE_FULL_BUSINESS.description,
      primary_city: "Springfield",
      primary_region: "IL",
    })
    .select("id")
    .single()
    .throwOnError();
  return biz.data.id;
}

const prompts = async (businessId: string) =>
  (await service.from("tracked_prompts").select("prompt, source, active").eq("business_id", businessId).order("created_at").throwOnError()).data ?? [];

describe("rebuilding questions after an industry change", () => {
  it("retires our suggestions, keeps the user's own question, and adds a set for the new industry", async () => {
    const businessId = await seedBusiness("coffee_shop");
    await service
      .from("tracked_prompts")
      .insert([
        { business_id: businessId, prompt: "What is the best bakery in Springfield, IL?", source: "library" },
        { business_id: businessId, prompt: "Which bakery in Springfield, IL has the best sourdough?", source: "library" },
        { business_id: businessId, prompt: "Who makes the best birthday cake in Springfield, IL?", source: "custom" },
      ])
      .throwOnError();

    const { clients } = fakeQuestionClients({ library: { coffee_shop: COFFEE_LIBRARY }, pick: COFFEE_GOOD_PICK, write: new Error("no write") });
    const result = await rebuildQuestionsForIndustry(businessId, clients);

    expect(result).toMatchObject({ rebuilt: true, retired: 2 });
    const rows = await prompts(businessId);
    expect(rows.filter((r) => r.prompt.includes("bakery")).every((r) => !r.active)).toBe(true);
    expect(rows.find((r) => r.source === "custom")).toMatchObject({ active: true });
    const active = rows.filter((r) => r.active && r.source === "library");
    expect(active.length).toBeGreaterThanOrEqual(12);
    expect(active.some((r) => r.prompt.includes("oat milk latte"))).toBe(true);
  });

  it("does nothing before the first set exists (the questions step makes that one)", async () => {
    const businessId = await seedBusiness("restaurant");
    const { clients, calls } = fakeQuestionClients({ library: { coffee_shop: COFFEE_LIBRARY }, pick: COFFEE_GOOD_PICK });
    expect(await rebuildQuestionsForIndustry(businessId, clients)).toEqual({ rebuilt: false });
    expect(calls).toEqual({ pick: 0, write: 0 });
  });

  it("treats the same industry in other words as no change", () => {
    expect(sameIndustry("Bookstore", " bookstore ")).toBe(true);
    expect(sameIndustry(null, "")).toBe(true);
    expect(sameIndustry("restaurant", "coffee_shop")).toBe(false);
  });
});
