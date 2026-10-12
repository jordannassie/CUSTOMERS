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

async function business(industry: string, city: string) {
  const { data: u } = await service.auth.admin.createUser({ email: `vitest-shared-${randomUUID()}@example.test`, email_confirm: true });
  users.push(u.user!.id);
  const { data: agency } = await service.from("agencies").insert({ owner_user_id: u.user!.id, name: "Shared", is_test: true }).select("id").single().throwOnError();
  const { data } = await service
    .from("businesses")
    .insert({ owner_user_id: u.user!.id, agency_id: agency.id, name: "Shop", status: "active", industry, primary_city: city, primary_region: "TX" })
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
});
