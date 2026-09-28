import { describe, expect, it } from "vitest";
import { CHECKLIST_KEYS, checklist, checklistKeyOf, missingBasics, websitePrompt, type ChecklistBusiness } from "./checklist";

const full: ChecklistBusiness = {
  name: "Sunrise Coffee Bar",
  city: "Springfield",
  region: "IL",
  industry: "coffee_shop",
  services: ["espresso drinks"],
  phone: "(217) 555-0142",
  domain: "sunrise-coffee.example",
  hasWebsite: true,
  placesId: "ChIJ-fixture-sunrise-coffee",
};

describe("get found by AI checklist", () => {
  it("is shown only when a basic is missing", () => {
    expect(missingBasics(full)).toEqual([]);
    expect(missingBasics({ ...full, hasWebsite: false, domain: null })).toEqual(["a website"]);
    expect(missingBasics({ ...full, placesId: null, phone: " " })).toEqual(["a Google Business Profile", "a phone number"]);
  });

  it("lists the 6 fixed items from MVP_SPEC 7.3 in order, with ticks from the saved set", () => {
    const items = checklist(full, new Set(["reviews"]));
    expect(items.map((i) => i.key)).toEqual([...CHECKLIST_KEYS]);
    expect(items.filter((i) => i.done).map((i) => i.key)).toEqual(["reviews"]);
    expect(items.find((i) => i.key === "website")?.copy?.kind).toBe("claude");
    expect(items.find((i) => i.key === "reviews")?.copy?.kind).toBe("message");
  });

  it("builds the website prompt from known facts and marks the rest as gaps", () => {
    const prompt = websitePrompt({ ...full, services: [], phone: null });
    expect(prompt).toContain("Sunrise Coffee Bar, a coffee shop in Springfield, IL.");
    expect(prompt).toContain("Our services: [fill in].");
    expect(prompt).toContain("do not invent any details");
    expect(prompt).not.toMatch(/null|undefined|\{/);
  });

  it("reads a checklist key back from a stored row", () => {
    expect(checklistKeyOf("checklist:website")).toBe("website");
    expect(checklistKeyOf("checklist:other")).toBeNull();
    expect(checklistKeyOf("https://example.com")).toBeNull();
    expect(checklistKeyOf(null)).toBeNull();
  });
});
