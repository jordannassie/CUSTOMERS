import { describe, expect, it } from "vitest";
import { focusMatches, usesSite } from "./focus";
import { questionsPageParams } from "./schema";
import { fixForSites, listText, siteBrand, whySkipped } from "./skipped";

describe("whySkipped", () => {
  const base = { label: "ChatGPT", sites: [{ host: "yelp.com" }, { host: "tripadvisor.com" }], competitors: ["Bean House"], others: [] };

  it("says which sites it used and who it named, from the answer only", () => {
    expect(whySkipped(base)).toBe("ChatGPT used yelp.com and tripadvisor.com here and named Bean House, not you.");
    expect(whySkipped({ ...base, sites: [] })).toBe("ChatGPT named Bean House, not you. It did not show which websites it used.");
    expect(whySkipped({ ...base, competitors: [] })).toBe("ChatGPT used yelp.com and tripadvisor.com here and did not name any business.");
    expect(whySkipped({ ...base, sites: [], competitors: [] })).toBe("ChatGPT did not name any business in this answer.");
  });

  it("says the names couldn't be read when the name finder failed, never that no business was named", () => {
    const unread = { ...base, competitors: [], namesChecked: false };
    expect(whySkipped(unread)).toBe("ChatGPT used yelp.com and tripadvisor.com here. We couldn't read which businesses it named.");
    expect(whySkipped({ ...unread, sites: [] })).toBe("We couldn't read which businesses ChatGPT named in this answer.");
    // Names found some other way still say who it named.
    expect(whySkipped({ ...base, namesChecked: false })).toBe("ChatGPT used yelp.com and tripadvisor.com here and named Bean House, not you.");
    expect(whySkipped({ ...base, competitors: [], namesChecked: true })).toBe("ChatGPT used yelp.com and tripadvisor.com here and did not name any business.");
  });

  it("shortens long lists", () => {
    expect(listText(["a", "b", "c", "d", "e"])).toBe("a, b and 3 others");
    expect(listText(["a", "b", "c"])).toBe("a, b and c");
  });
});

describe("fixForSites", () => {
  const fixes = [
    { id: "f1", title: "Ask customers for Google reviews", text: "Your Google listing has 12 reviews." },
    { id: "f2", title: "Claim your listing", text: "Get listed on Yelp with your hours." },
  ];

  it("finds the fix that names a site the answer used, by address or name", () => {
    expect(fixForSites(fixes, ["tripadvisor.com", "yelp.com"])).toEqual({ id: "f2", title: "Claim your listing", host: "yelp.com" });
    expect(fixForSites(fixes, ["maps.google.com"])?.id).toBe("f1");
    expect(fixForSites(fixes, ["bbb.org"])).toBeNull();
  });

  it("reads the name of a site", () => {
    expect(siteBrand("yelp.co.uk")).toBe("yelp");
    expect(siteBrand("maps.google.com")).toBe("google");
    // Short names only match the whole address, so "bbb" never matches a word inside another.
    expect(fixForSites([{ id: "x", title: "Add hobbbies", text: "" }], ["bbb.org"])).toBeNull();
  });
});

describe("focus links", () => {
  const check = (questionId: string, youNamed: boolean, sites: string[], competitors: string[] = [], extracted: unknown = null) => ({
    questionId,
    youNamed,
    sites,
    competitors,
    extracted,
  });
  const checks = [
    check("q1", false, ["maps.google.com"], ["Bean House"]),
    check("q2", true, ["yelp.com"], ["Bean House"]),
    check("q3", false, ["yelp.com"], [], { names: [{ name: "Slice Theory", matches: null }] }),
  ];

  it("keeps questions whose answers used the site, subdomains too", () => {
    expect(usesSite("maps.google.com", "google.com")).toBe(true);
    expect(usesSite("notgoogle.com", "google.com")).toBe(false);
    expect([...focusMatches(checks, { site: "google.com" })!]).toEqual(["q1"]);
    expect([...focusMatches(checks, { site: "yelp.com" })!].sort()).toEqual(["q2", "q3"]);
  });

  it("keeps questions where that business was named and you were not", () => {
    expect([...focusMatches(checks, { named: "bean house" })!]).toEqual(["q1"]);
    expect([...focusMatches(checks, { named: "Slice Theory", site: "yelp.com" })!]).toEqual(["q3"]);
    expect(focusMatches(checks, {})).toBeUndefined();
  });

  it("needs one answer to do both: use the site and name them, not you (Compare's See the answers)", () => {
    // q4: one answer used yelp.com without naming them, another named them without yelp.com.
    const split = [check("q4", false, ["yelp.com"]), check("q4", false, ["google.com"], ["Bean House"])];
    expect([...focusMatches(split, { site: "yelp.com", named: "Bean House" })!]).toEqual([]);
    expect([...focusMatches([...split, check("q4", false, ["yelp.com"], ["Bean House"])], { site: "yelp.com", named: "Bean House" })!]).toEqual(["q4"]);
  });

  it("finds a chain by the name AI used as well as the tracked branch name", () => {
    const chain = check("q5", false, ["google.com"], ["Domino's Pizza | Chaklala-III"], {
      names: [{ name: "Domino's Pizza", matches: "competitor", competitorName: "Domino's Pizza | Chaklala-III" }],
    });
    expect([...focusMatches([chain], { named: "Domino's Pizza" })!]).toEqual(["q5"]);
    expect([...focusMatches([chain], { named: "Domino's Pizza | Chaklala-III" })!]).toEqual(["q5"]);
  });

  it("checks the page's search params and drops bad ones", () => {
    const id = "0e3f6a2b-1c4d-4e5f-8a9b-0c1d2e3f4a5b";
    expect(questionsPageParams.parse({ q: id, site: "https://www.Yelp.com/biz/x", named: " Bean House " })).toEqual({
      q: id,
      site: "yelp.com",
      named: "Bean House",
    });
    expect(questionsPageParams.parse({ q: "nope", site: "javascript:alert(1)", named: ["a"] })).toEqual({});
  });

  it("keeps a competitor name up to 200 characters, as long as names can be", () => {
    const long = `Domino's Pizza ${"Chaklala ".repeat(25)}`.slice(0, 199) + "x";
    expect(long).toHaveLength(200);
    expect(questionsPageParams.parse({ named: long }).named).toBe(long);
    expect(questionsPageParams.parse({ named: "x".repeat(201) })).toEqual({});
  });
});
