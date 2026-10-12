import { describe, expect, it } from "vitest";
import { branchOf, chainName, namesBranch } from "./branch";

describe("branchOf", () => {
  it.each([
    ["Bennu Coffee on Congress", "Bennu Coffee", "Congress"],
    ["Desnudo Coffee: East Austin", "Desnudo Coffee", "East Austin"],
    ["Bennu Coffee - Downtown", "Bennu Coffee", "Downtown"],
    ["Kerbey Lane Cafe at The Domain", "Kerbey Lane Cafe", "The Domain"],
    ["Bennu Coffee (South Lamar)", "Bennu Coffee", "South Lamar"],
    ["Epoch Coffee North Loop", "Epoch Coffee", "North Loop"],
    ["Starbucks | 6th Street", "Starbucks", "6th Street"],
  ])("%s is a branch of %s", (name, brand, place) => {
    expect(branchOf(name, "Austin")).toEqual({ brand, place });
  });

  it.each([
    "Pizza Hut",
    // "City of Books" is part of the name.
    "Powell's City of Books",
    // Says what the business does, not where it is.
    "Roto-Rooter Plumbing & Water Cleanup",
    "Radiant Plumbing, Air Conditioning, & Electrical",
    "First Light Book Shop",
    "Fleet Coffee Co",
    "Joe's Pizza - Best Pizza",
    "Bennu Coffee - open late",
    // One word before "on" is not a chain.
    "Hooked on Phonics",
    // Only the city the questions are about: answers about Austin name it anyway.
    "Reliant Plumbing - Austin",
    "Reliant Plumbing - Austin, TX",
    "Mr. Rooter Plumbing of Austin",
  ])("%s is not a branch", (name) => {
    expect(branchOf(name, "Austin")).toBeNull();
  });

  it("counts a city other than the business's as a place", () => {
    expect(branchOf("Mr. Rooter Plumbing of Austin", "San Antonio")).toEqual({ brand: "Mr. Rooter Plumbing", place: "Austin" });
  });
});

describe("namesBranch", () => {
  const bennu = { brand: "Bennu Coffee", place: "Congress" };
  const name = "Bennu Coffee on Congress";

  it("is true for the full name or the place near the chain's name", () => {
    expect(namesBranch("Try Bennu Coffee on Congress for late nights.", name, bennu)).toBe(true);
    expect(namesBranch("- Bennu Coffee is located at 515 S Congress Ave.", name, bennu)).toBe(true);
    expect(namesBranch("**Bennu Coffee** is open 24/7 and has locations around Austin, including on South Congress.", name, bennu)).toBe(true);
  });

  it("is false when the answer names only the chain", () => {
    expect(namesBranch("- Houndstooth Coffee\n- Bennu Coffee\n- Roosevelt Coffee", name, bennu)).toBe(false);
    expect(namesBranch(`Bennu Coffee is great. ${"x ".repeat(200)}Later: Jo's Coffee on South Congress.`, name, bennu)).toBe(false);
  });
});

describe("chainName", () => {
  const brandOnly = "Bennu Coffee is open 24 hours.";
  const branch = "Bennu Coffee on Congress is open 24 hours.";

  it("names the chain when fewer than half the answers named the branch", () => {
    expect(chainName("Bennu Coffee on Congress", "Austin", [brandOnly, brandOnly, branch])).toBe("Bennu Coffee");
    expect(chainName("Bennu Coffee on Congress", "Austin", [brandOnly, branch])).toBeNull();
    expect(chainName("Bennu Coffee on Congress", "Austin", [branch])).toBeNull();
  });

  it("is null for a name that is not a branch, or with no answers", () => {
    expect(chainName("Pizza Hut", "Austin", ["Pizza Hut is near you."])).toBeNull();
    expect(chainName("Bennu Coffee on Congress", "Austin", [])).toBeNull();
  });
});
