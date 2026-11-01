import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { createServiceClient } from "@/lib/supabase/service";
import { loadSharedQuestions } from "./dal";

// BUG-116: a second business of the same kind in the same city gets the first one's suggested questions.
const service = createServiceClient();
const users: string[] = [];
afterAll(async () => {
  for (const id of users) await service.auth.admin.deleteUser(id);
});

async function business(industry: string, city: string, extra: { status?: string; deleted_at?: string } = {}) {
  const { data: u } = await service.auth.admin.createUser({ email: `vitest-shared-${randomUUID()}@example.test`, email_confirm: true });
  users.push(u.user!.id);
  const { data: agency } = await service.from("agencies").insert({ owner_user_id: u.user!.id, name: "Shared", is_test: true }).select("id").single().throwOnError();
  const { data } = await service
    .from("businesses")
    .insert({ owner_user_id: u.user!.id, agency_id: agency.id, name: "Shop", status: "active", industry, primary_city: city, primary_region: "TX", ...extra })
    .select("id")
    .single()
    .throwOnError();
  return data.id;
}

describe("loadSharedQuestions", () => {
  it("returns another business's suggested questions for the same kind and city, never the owner's own", async () => {
    const city = `Sharedville ${randomUUID().slice(0, 6)}`;
    const first = await business("Bookstore", city);
    const rows = Array.from({ length: 6 }, (_, i) => ({ business_id: first, prompt: `Which bookstore in ${city} is best ${i}?`, buyer_intent: "best", source: "library" }));
    await service.from("tracked_prompts").insert([...rows, { business_id: first, prompt: "My own question?", buyer_intent: "best", source: "custom" }]).throwOnError();

    const shared = await loadSharedQuestions("bookstore", city, "TX");
    expect(shared.map((q) => q.text)).toEqual(rows.map((r) => r.prompt));
    expect(await loadSharedQuestions("Florist", city, "TX")).toEqual([]);
    expect(await loadSharedQuestions("Bookstore", `${city} %`, "TX")).toEqual([]);
  });

  it("shares only questions a set-up business asks now: not paused or removed ones, nor a draft's or a deleted one's", async () => {
    const city = `Filterville ${randomUUID().slice(0, 6)}`;
    const set = (id: string, label: string) =>
      Array.from({ length: 6 }, (_, i) => ({ business_id: id, prompt: `${label} bookstore in ${city} ${i}?`, buyer_intent: "best", source: "library", active: true }));
    const draft = await business("Bookstore", city, { status: "onboarding" });
    const deleted = await business("Bookstore", city, { deleted_at: new Date().toISOString() });
    const live = await business("Bookstore", city);
    const asked = set(live, "Asked");
    await service
      .from("tracked_prompts")
      .insert([
        ...set(draft, "Draft"),
        ...set(deleted, "Deleted"),
        ...asked,
        { business_id: live, prompt: `Paused bookstore in ${city}?`, buyer_intent: "best", source: "library", active: false },
        { business_id: live, prompt: `Removed bookstore in ${city}?`, buyer_intent: "best", source: "library", active: false, removed_at: new Date().toISOString() },
      ])
      .throwOnError();

    // Inserted together, so they share a created_at: compared without order.
    const shared = await loadSharedQuestions("Bookstore", city, "TX");
    expect(shared.map((q) => q.text).sort()).toEqual(asked.map((r) => r.prompt).sort());
  });
});
