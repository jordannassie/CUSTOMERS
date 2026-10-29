import { describe, expect, it } from "vitest";
import { CHECKLIST_KEYS, NO_BRANCH_MARKER, checklist, checklistKeyOf, missingBasics, noBranchQuery, websitePrompt, type ChecklistBusiness } from "./checklist";

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

  it("never asks a chain to claim a profile while its branch can still be picked on Google (step 6d)", () => {
    const chain = { ...full, hasWebsite: true, domain: "kfcpakistan.com", phone: "+92 51 111 532 532", placesId: null, branchPending: true };
    expect(missingBasics(chain)).toEqual([]);
    expect(checklist(chain, new Set()).map((i) => i.key)).not.toContain("google_profile");
    // Google lists no branch: the claim step is back.
    expect(missingBasics({ ...chain, branchPending: false })).toEqual(["a Google Business Profile"]);
    expect(checklist({ ...chain, branchPending: false }, new Set()).map((i) => i.key)).toContain("google_profile");
  });

  it("never tells a business with a website to build one (BUG-087)", () => {
    expect(checklist(full, new Set()).map((i) => i.key)).not.toContain("website");
  });

  it("lists the 6 fixed items from MVP_SPEC 7.3 in order, with ticks from the saved set", () => {
    const items = checklist({ ...full, hasWebsite: false, domain: null }, new Set(["reviews"]));
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

  it("reads back a saved search that found no branch of a chain (step 6d)", () => {
    // The same text as NO_BRANCH_MARKER in onboarding/branch/service.ts (its service.test.ts checks that one).
    expect(NO_BRANCH_MARKER).toBe("checklist:no_branch");
    expect(checklistKeyOf(NO_BRANCH_MARKER)).toBeNull();
    expect(noBranchQuery([{ affected_url: "checklist:website" }])).toBeNull();
    expect(noBranchQuery([{ affected_url: NO_BRANCH_MARKER, evidence_data: { query: "KFC Nowhere" } }])).toBe("KFC Nowhere");
    // Saved without its words: still "no branch found", with the default search in the box.
    expect(noBranchQuery([{ affected_url: NO_BRANCH_MARKER, evidence_data: {} }])).toBe("");
    expect(noBranchQuery([{ affected_url: NO_BRANCH_MARKER, evidence_data: null }])).toBe("");
  });
});
