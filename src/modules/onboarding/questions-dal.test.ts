import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { createServiceClient } from "@/lib/supabase/service";
import { loadQuestionLibrary } from "./dal";

// B-33 against the local database. A made-up industry key keeps these rows apart from the real library.
const service = createServiceClient();
const industry = `vitest-${randomUUID()}`;

afterAll(async () => {
  await service.from("question_library").delete().eq("industry", industry);
});

describe("loadQuestionLibrary", () => {
  it("returns only active templates of the newest version", async () => {
    const { error } = await service.from("question_library").insert([
      { industry, template: "Old best in {city}?", tags: ["general"], intent: "best", version: 1, active: true },
      { industry, template: "Best in {city}?", tags: ["general"], intent: "best", version: 2, active: true },
      { industry, template: "Cheapest in {city}?", tags: ["general"], intent: "price", version: 2, active: true },
      { industry, template: "Retired in {city}?", tags: ["general"], intent: "urgent", version: 2, active: false },
    ]);
    if (error) throw error;

    const library = await loadQuestionLibrary(industry);
    expect(library.map((e) => e.template).sort()).toEqual(["Best in {city}?", "Cheapest in {city}?"]);
    expect(library[0]).toEqual({ id: expect.any(String), template: expect.any(String), tags: ["general"], intent: expect.any(String) });
  });

  it("returns an empty list for an industry with no library", async () => {
    expect(await loadQuestionLibrary(`${industry}-none`)).toEqual([]);
  });
});
