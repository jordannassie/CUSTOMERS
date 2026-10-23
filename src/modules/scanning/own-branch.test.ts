import { describe, expect, it } from "vitest";
import { branchOf, ownChain } from "./branch";
import { isSameBusiness } from "./extract-match";
import { detectMention } from "./mentions";
import { mentionTargets, ownBranch, recountCheck } from "./recount/service";

// Step 7 (the open part of BUG-132): a tracked business that is itself one branch. Its own score counts only answers
// that name the branch, or the brand with the branch's place or area nearby; the chain's mentions are shown apart.
const bennu = { name: "Bennu Coffee on Congress", aliases: null, domain: "bennucoffee.com", city: "Austin", phone: null, hasWebsite: true, area: "Travis Heights" };
const { business } = mentionTargets(bennu, []);

describe("a business that is one branch (step 7)", () => {
  it("knows its places: the branch's own and its area", () => {
    expect(ownBranch(bennu)).toEqual({ brand: "Bennu Coffee", places: ["Congress", "Travis Heights"] });
    expect(ownBranch({ ...bennu, name: "Bennu Coffee" })).toBeNull();
    // A name that only reads like "<brand> <place>" keeps its own mentions: the website must spell the brand.
    expect(ownBranch({ ...bennu, name: "Push Pull on Union", domain: null, city: "Seattle" })).toBeNull();
    expect(ownBranch({ ...bennu, name: "Bedigital.pk - Digitizing Businesses - Full Service AI Agency", domain: "bedigital.pk", city: "Rawalpindi" })).toBeNull();
    expect(ownBranch({ ...bennu, name: "Cheezious Golra Mor Branch", domain: "cheezious.com", city: "Islamabad", area: null })).toEqual({ brand: "Cheezious", places: ["Golra Mor"] });
  });

  it("counts only answers that name the branch, or the brand with its place or area", () => {
    expect(detectMention("1. **Bennu Coffee on Congress** is open late.", business).mentioned).toBe(true);
    expect(detectMention("Bennu Coffee, 515 S Congress Ave, has a patio.", business).mentioned).toBe(true);
    expect(detectMention("Bennu Coffee in Travis Heights roasts its own beans.", business).mentioned).toBe(true);
    expect(detectMention("Bennu Coffee is a local favorite with three locations.", business).mentioned).toBe(false);
    expect(detectMention("See bennucoffee.com for hours.", business).mentioned).toBe(false);
  });

  it("does not take the chain's name from the name extraction either", () => {
    expect(isSameBusiness("Bennu Coffee", business)).toBe(false);
    expect(isSameBusiness("Bennu Coffee on Congress", business)).toBe(true);
    expect(isSameBusiness("Bennu Coffee (Congress)", business)).toBe(true);
  });

  it("needs the chain's name with the place or area: another business on that street or in that area is not it", () => {
    const eastAustin = mentionTargets({ ...bennu, area: "East Austin" }, []).business;
    expect(isSameBusiness("Houndstooth Coffee - Congress Ave", eastAustin)).toBe(false);
    expect(isSameBusiness("East Austin Coffee House", eastAustin)).toBe(false);
    expect(isSameBusiness("Congress Avenue Kitchen", eastAustin)).toBe(false);
    expect(isSameBusiness("Bennu Coffee Congress", eastAustin)).toBe(true);
    expect(isSameBusiness("Bennu Coffee East Austin", eastAustin)).toBe(true);
    expect(isSameBusiness("Bennu Coffee on Congress", eastAustin)).toBe(true);
    expect(isSameBusiness("Bennu Coffee", eastAustin)).toBe(false);
  });

  it("re-marks a saved chain-only answer when the answers are counted again", () => {
    const saved = { id: "r1", answer_text: "Bennu Coffee is a local favorite.", extracted_names: null, business_mentioned: true, mention_position: null, competitors_mentioned: [] };
    expect(recountCheck(saved, mentionTargets(bennu, []))?.business_mentioned).toBe(false);
  });

  it("leaves a competitor that is a branch as before: its chain's mentions count, and the row says so (BUG-132)", () => {
    const { competitors } = mentionTargets({ ...bennu, name: "Flat Track Coffee", domain: "flattrackcoffee.com", area: null }, [
      { name: "Bennu Coffee on Congress", domain: null, phone: null, city: "Austin" },
    ]);
    expect(competitors[0].branch).toBeUndefined();
    expect(isSameBusiness("Bennu Coffee", competitors[0])).toBe(true);
  });

  it("finds a branch whose brand the website spells: Cheezious Golra Mor Branch on cheezious.com", () => {
    expect(branchOf("Cheezious Golra Mor Branch", "Islamabad", "cheezious.com")).toEqual({ brand: "Cheezious", place: "Golra Mor" });
    // Only the city is left: the flagship is the brand in that city, not a branch to tell apart.
    expect(branchOf("Nike Flagship Store Islamabad", "Islamabad", "nike.com")).toBeNull();
    // Competitors call it without a website, as before.
    expect(branchOf("Cheezious Golra Mor Branch", "Islamabad")).toBeNull();
  });

  it("counts the chain's mentions apart from the score", () => {
    const chain = ownChain("Bennu Coffee", ["Bennu Coffee is great.", "Try Bennu Coffee on Congress.", "Epoch Coffee is open late."]);
    expect(chain).toEqual({ brand: "Bennu Coffee", named: 2, answers: 3 });
  });
});
