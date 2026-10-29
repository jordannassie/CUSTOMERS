import { describe, expect, it } from "vitest";
import { meaningWords, serviceGaps, websiteGaps, type TheirWebsite, type YourSite } from "./website";

const theirs: TheirWebsite = {
  status: "read",
  services: [
    { name: "Office catering", page: "/services" },
    { name: "Coffee beans to go", page: "/" },
    { name: "Tire rotation", page: "/services" },
  ],
  hasPhone: true,
  hasAddress: true,
};
const yours: YourSite = { read: true, services: ["pour-over coffee", "espresso drinks"], hasPhone: false, hasAddress: true };

describe("meaningWords", () => {
  it("keeps words about the offer, singular", () => {
    expect(meaningWords("Tires and wheel services")).toEqual(["tire", "wheel"]);
    expect(meaningWords("Office catering")).toEqual(["office", "catering"]);
  });
});

describe("serviceGaps", () => {
  it("lists only services with no word in common with yours", () => {
    expect(serviceGaps(theirs, yours).map((s) => s.name)).toEqual(["Office catering", "Tire rotation"]);
  });
});

describe("websiteGaps", () => {
  it("puts a gap that matches a question they win first, then a plain gap, then contact", () => {
    const facts = websiteGaps("Bean Tires", theirs, yours, [{ question: "Who does tire rotation in Dallas?" }]);
    expect(facts.map((f) => [f.title, f.detail])).toEqual([
      ["Their website lists Tire rotation", 'Not in the services on yours. AI named them more often on "Who does tire rotation in Dallas?".'],
      ["Their website lists Office catering", "Not in the services on yours. Found on their /services page."],
      ["Their website shows a phone number", "We didn't find one on yours."],
    ]);
    expect(facts[0]).toMatchObject({ where: "website", text: "Bean Tires' website lists Tire rotation, and the services on your website don't include it." });
  });

  it("compares nothing unless both sites were read", () => {
    expect(websiteGaps("X", { ...theirs, status: "blocked" }, yours, [])).toEqual([]);
    expect(websiteGaps("X", theirs, { ...yours, read: false }, [])).toEqual([]);
    expect(websiteGaps("X", null, yours, [])).toEqual([]);
  });
});
