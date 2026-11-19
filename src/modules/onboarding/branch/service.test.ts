import { describe, expect, it } from "vitest";
import type { PlaceCandidate } from "../places";
import { branchChoices, branchQuery, MAX_BRANCH_CHOICES, NO_BRANCH_MARKER, needsBranch, noBranchFound, noBranchRow, notSearched, showClaimStep } from "./service";

const listing = (placeId: string, name: string, websiteUri: string | null = null): PlaceCandidate => ({
  placeId,
  name,
  address: `${name}, Islamabad`,
  phone: null,
  primaryType: "fast_food_restaurant",
  types: [],
  websiteUri,
  city: "Islamabad",
  state: null,
  country: "PK",
  area: null,
});

describe("pick your branch on Google (step 6d)", () => {
  it("is for a chain with no listing picked yet", () => {
    expect(needsBranch({ chain: true, placesId: null })).toBe(true);
    expect(needsBranch({ chain: true, placesId: "ChIJ-kfc-f7-markaz" })).toBe(false);
    expect(needsBranch({ chain: false, placesId: null })).toBe(false);
    expect(branchQuery("KFC", "Islamabad")).toBe("KFC Islamabad");
    expect(branchQuery("KFC", null)).toBe("KFC");
  });

  it("offers the brand's own branches and drops other businesses the search found", () => {
    const found = [
      listing("ChIJ-kfc-f7-markaz", "KFC F-7 Markaz", "https://www.kfcpakistan.com/"),
      listing("ChIJ-kfc-blue-area", "KFC Blue Area"),
      listing("ChIJ-kfc-centaurus", "KFC", "https://kfcpakistan.com/store/centaurus"),
      listing("ChIJ-howdy-kfc-fans", "Howdy, a burger place near KFC"),
      listing("ChIJ-kfcafe", "KFCafe Bakery"),
    ];
    expect(branchChoices(found, "KFC", "kfcpakistan.com").map((c) => c.placeId)).toEqual([
      "ChIJ-kfc-f7-markaz",
      "ChIJ-kfc-blue-area",
      "ChIJ-kfc-centaurus",
    ]);
    // Only the place ID, name and address go to the screen; the name and address are never saved (D-73).
    expect(Object.keys(branchChoices(found, "KFC", null)[0])).toEqual(["placeId", "name", "address"]);
    const many = Array.from({ length: 8 }, (_, i) => listing(`ChIJ-tim-hortons-${i}`, `Tim Hortons ${i}`));
    expect(branchChoices(many, "Tim Hortons", "timhortons.com.pk")).toHaveLength(MAX_BRANCH_CHOICES);
  });

  it("shows the claim step only when Google lists no branch of the chain", () => {
    const chain = { chain: true, placesId: null };
    const search = (choices: number, unavailable = false) => ({
      query: "KFC Islamabad",
      choices: Array.from({ length: choices }, (_, i) => ({ placeId: `ChIJ-${i}-branch`, name: "KFC", address: null })),
      unavailable,
      searched: true,
    });
    expect(showClaimStep(chain, search(3))).toBe(false);
    expect(showClaimStep(chain, search(0))).toBe(true);
    // Google down is not "no branch": the picker stays, so the owner can search again later.
    expect(showClaimStep(chain, search(0, true))).toBe(false);
    // Before the owner searches, nothing is known yet: no claim step, and the card asks them to search.
    expect(notSearched("KFC", "Islamabad")).toEqual({ query: "KFC Islamabad", choices: [], unavailable: false, searched: false });
    expect(showClaimStep(chain, notSearched("KFC", "Islamabad"))).toBe(false);
    // Single shops are unchanged: the claim step shows when they have no listing.
    expect(showClaimStep({ chain: false, placesId: null }, null)).toBe(true);
    expect(showClaimStep({ chain: false, placesId: "ChIJ-own-listing" }, null)).toBe(false);
  });

  it("saves a search that found no branch as a hidden marker row, the one opportunities/checklist.ts reads", () => {
    const searched = { query: "KFC Nowhere", choices: [], unavailable: false, searched: true };
    expect(noBranchFound(searched)).toBe(true);
    expect(noBranchFound({ ...searched, unavailable: true })).toBe(false);
    expect(noBranchFound({ ...searched, searched: false })).toBe(false);
    expect(noBranchFound({ ...searched, choices: [{ placeId: "ChIJ-1", name: "KFC F-7", address: null }] })).toBe(false);
    // The same text as NO_BRANCH_MARKER in opportunities/checklist.ts (checklist.test.ts checks that one).
    expect(NO_BRANCH_MARKER).toBe("checklist:no_branch");
    // Dismissed and not from a scan: no board, count, report or email shows it as a fix. Only the words typed are kept.
    expect(noBranchRow("b-1", "KFC Nowhere")).toMatchObject({
      business_id: "b-1",
      status: "dismissed",
      source: "manual",
      affected_url: NO_BRANCH_MARKER,
      dedupe_key: NO_BRANCH_MARKER,
      evidence_data: { query: "KFC Nowhere" },
    });
  });
});
