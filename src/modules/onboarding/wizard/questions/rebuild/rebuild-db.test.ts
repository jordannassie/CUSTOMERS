// A new industry rebuilds the suggested questions, against the local database: the old suggestions are retired (kept
// for past results), the user's own questions stay, and nothing happens before the first set exists.
import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { createServiceClient } from "@/lib/supabase/service";
import { COFFEE_FULL_BUSINESS, COFFEE_GOOD_PICK, COFFEE_LIBRARY, fakeQuestionClients } from "../../../question-fixtures";
import { questionBasisChanged, rebuildQuestionsForIndustry, sameIndustry } from "./dal";

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
  (await service.from("tracked_prompts").select("prompt, source, active, removed_at").eq("business_id", businessId).order("created_at").throwOnError()).data ?? [];

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
    // Removed, not just inactive, so the Questions page never offers them back as paused (removed_at, like step 9e).
    expect(rows.filter((r) => r.prompt.includes("bakery")).every((r) => !r.active && r.removed_at !== null)).toBe(true);
    expect(rows.find((r) => r.source === "custom")).toMatchObject({ active: true, removed_at: null });
    const active = rows.filter((r) => r.active && r.source === "library");
    expect(active.length).toBeGreaterThanOrEqual(12);
    expect(active.some((r) => r.prompt.includes("oat milk latte"))).toBe(true);
  });

  it("removes a paused suggestion too, so Resume never brings back a question for the old trade", async () => {
    const businessId = await seedBusiness("coffee_shop");
    await service
      .from("tracked_prompts")
      .insert([
        { business_id: businessId, prompt: "What is the best bakery in Springfield, IL?", source: "library", active: true },
        { business_id: businessId, prompt: "Which bakery in Springfield, IL is open late?", source: "library", active: false },
        { business_id: businessId, prompt: "Who bakes gluten free bread in Springfield, IL?", source: "custom", active: false },
      ])
      .throwOnError();
    const { clients } = fakeQuestionClients({ library: { coffee_shop: COFFEE_LIBRARY }, pick: COFFEE_GOOD_PICK, write: new Error("no write") });
    expect(await rebuildQuestionsForIndustry(businessId, clients)).toMatchObject({ rebuilt: true, retired: 2 });
    const rows = await prompts(businessId);
    expect(rows.filter((r) => r.prompt.includes("bakery")).every((r) => r.removed_at !== null)).toBe(true);
    // The user's own paused question is theirs to resume.
    expect(rows.find((r) => r.source === "custom")).toMatchObject({ active: false, removed_at: null });
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

  it("counts a new city, region or area as a change, not the same place in other words", () => {
    const austin = { industry: "plumber", city: "Austin", region: "TX", area: null };
    expect(questionBasisChanged(austin, { ...austin, city: " austin ", area: "" })).toBe(false);
    expect(questionBasisChanged(austin, { ...austin, city: "Dallas" })).toBe(true);
    expect(questionBasisChanged(austin, { ...austin, region: "CA" })).toBe(true);
    expect(questionBasisChanged(austin, { ...austin, area: "East Austin" })).toBe(true);
    expect(questionBasisChanged(austin, { ...austin, industry: "electrician" })).toBe(true);
  });

  it("counts new services as a change, ignoring case, spacing and order, and skips them when a side has none", () => {
    const plumber = { industry: "plumber", city: "Austin", region: "TX", area: null, services: ["Drain cleaning", "water heaters"] };
    expect(questionBasisChanged(plumber, { ...plumber, services: [" water heaters", "drain cleaning "] })).toBe(false);
    expect(questionBasisChanged(plumber, { ...plumber, services: ["drain cleaning", "water heaters", "leak repair"] })).toBe(true);
    expect(questionBasisChanged(plumber, { ...plumber, services: [] })).toBe(true);
    // Settings sends no services: only the trade and place count there.
    expect(questionBasisChanged(plumber, { ...plumber, services: undefined })).toBe(false);
  });
});
