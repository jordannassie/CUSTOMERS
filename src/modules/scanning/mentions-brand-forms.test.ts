import { describe, expect, it } from "vitest";
import { branchBrand, brandForms } from "./mention-text";
import { detectMention } from "./mentions";

// From the adidas and Nike checks on 2026-10-12: real answer shapes that were not counted.
describe("a lowercase brand set out as a name (BUG-141)", () => {
  const adidas = { name: "Adidas", website: "adidas.com", city: "Islamabad" };

  it.each([
    ["in bold", "2. **adidas — Centaurus Mall**: sportswear and shoes."],
    ["at the start of a list item", "- adidas Centaurus Mall, F-8"],
    ["in a heading", "### adidas\nThe brand store in Centaurus Mall."],
  ])("counts it %s", (_, answer) => {
    expect(detectMention(answer, adidas).mentioned).toBe(true);
  });

  it("still ignores the word in running prose", () => {
    expect(detectMention("You can find adidas shoes at many stores.", adidas).mentioned).toBe(false);
    expect(detectMention("Look for sapphire earrings downtown.", { name: "Sapphire", website: "sapphire.com.pk", city: "Lahore" }).mentioned).toBe(false);
  });

  it("keeps the list position", () => {
    expect(detectMention("1. **Nike**\n2. **adidas — Centaurus Mall**", adidas).position).toBe(2);
  });
});

describe("the brand before a branch's own words (BUG-142)", () => {
  it.each([
    ["Nike Flagship Store Islamabad", "Islamabad", "Nike"],
    ["Khaadi Outlet", "Lahore", "Khaadi"],
    ["Under Armour Factory Outlet", "Austin", "Under Armour"],
    ["Cheezious Branch 2", "Islamabad", "Cheezious"],
    // Only the branch words go; the rest of the name stays.
    ["Nike Running Club Store", "Austin", "Nike Running Club"],
  ])("%s gives %s's brand", (name, city, brand) => {
    expect(branchBrand(name, city)).toBe(brand);
  });

  it.each([
    ["Nike Store Downtown Mall", "Austin"],
    ["Store", "Austin"],
    ["Book Store", "Austin"],
    ["Nike", "Austin"],
  ])("leaves %s alone", (name, city) => {
    expect(branchBrand(name, city)).toBeNull();
  });

  it("counts Nike for the Islamabad flagship when the business has no website", () => {
    const nike = { name: "Nike Flagship Store Islamabad", city: "Islamabad" };
    expect(brandForms(nike)).toContain("Nike");
    expect(detectMention("1. **Nike** at Centaurus Mall has the widest range.", nike).mentioned).toBe(true);
    expect(detectMention("Most runners like nike shoes.", nike).mentioned).toBe(false);
  });
});
