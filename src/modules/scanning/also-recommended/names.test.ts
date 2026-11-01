import { describe, expect, it } from "vitest";
import { alsoRecommendedNames } from "./names";

const business = { name: "Sunrise Coffee Bar", website: "sunrisecoffee.example" };
const extraction = (...names: [string, ("business" | "competitor" | null)?][]) => ({
  promptVersion: "extract-names.v1",
  names: names.map(([name, matches = null], i) => ({ name, position: i + 1, matches, competitorName: null })),
});

describe("alsoRecommendedNames", () => {
  it("counts each untracked business once per answer, most named first", () => {
    const list = alsoRecommendedNames(
      [
        extraction(["Sunrise Coffee Bar", "business"], ["Blue Door Coffee"], ["Bean House", "competitor"]),
        extraction(["Blue Door Coffee"], ["Blue Door Coffee"], ["Kiln Coffee Co"]),
        extraction(["blue door coffee"]),
        null,
        { unexpected: true },
      ],
      business,
      [{ name: "Bean House" }],
    );
    expect(list).toEqual({
      answers: 3,
      names: [
        { name: "Blue Door Coffee", answers: 3 },
        { name: "Kiln Coffee Co", answers: 1 },
      ],
    });
  });

  it("matches against today's list, so a newly tracked business drops out and a removed one returns", () => {
    const answers = [extraction(["Bean House", "competitor"], ["Blue Door Coffee"])];
    expect(alsoRecommendedNames(answers, business, [{ name: "Blue Door Coffee" }]).names).toEqual([
      { name: "Bean House", answers: 1 },
    ]);
  });

  it("leaves out the business itself when it was named another way", () => {
    const list = alsoRecommendedNames([extraction(["sunrisecoffee.example"], ["Sunrise Coffee Bar of Springfield"])], business, []);
    expect(list.names).toEqual([]);
  });

  it("keeps the top entries only", () => {
    const answers = [extraction(...Array.from({ length: 12 }, (_, i): [string] => [`Cafe Number ${i + 1}`]))];
    expect(alsoRecommendedNames(answers, business, [], 8).names).toHaveLength(8);
  });
  it("lists one place once when answers name it two ways: Canopy and Canopy by Hilton Austin Downtown (step 9b)", () => {
    const austin = { ...business, city: "Austin" };
    const list = alsoRecommendedNames(
      [
        extraction(["Canopy"], ["The Driskill"]),
        extraction(["Canopy by Hilton Austin Downtown"]),
        extraction(["Canopy", "competitor"], ["Canopy by Hilton Austin Downtown"]),
        // A generic first word or the city never pulls other names in.
        extraction(["Austin Java"], ["The Line Austin"], ["The"], ["Austin"]),
      ],
      austin,
      [],
    );
    const canopy = list.names.filter((n) => n.name.startsWith("Canopy"));
    expect(canopy).toEqual([{ name: "Canopy", answers: 3 }]);
    expect(list.names.map((n) => n.name)).toEqual(expect.arrayContaining(["Austin Java", "The Line Austin", "The Driskill"]));
  });

  it("lists one brand once when answers write it long and short (BUG-097)", () => {
    const list = alsoRecommendedNames(
      [
        extraction(["Abacus Plumbing, Air Conditioning & Electrical"], ["Abacus Plumbing"]),
        extraction(["Abacus Plumbing"]),
        extraction(["Abacus Plumbing, Air Conditioning & Electrical"]),
        extraction(["Abacus Plumbing"]),
      ],
      business,
      [],
    );
    expect(list.names).toEqual([{ name: "Abacus Plumbing", answers: 4 }]);
  });

  it("leaves out the short brand of a tracked competitor", () => {
    const list = alsoRecommendedNames([extraction(["Radiant Plumbing"], ["Reliant Plumbing"])], business, [
      { name: "Radiant Plumbing, Air Conditioning, & Electrical" },
      { name: "Reliant Plumbing - Austin" },
    ]);
    expect(list.names).toEqual([]);
  });
});
