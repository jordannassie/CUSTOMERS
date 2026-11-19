import { describe, expect, it } from "vitest";
import { comparisonIssues, listingIssues, sentences } from "./claims";
import { buildExplainInput, type ExplainInput } from "./facts";
import { COFFEE_SOURCES } from "./fixtures";

// Beyond Wow, Austin (BUG-099, BUG-100): its 4.9 rating beats all four competitors, but they are open more days.
const base = buildExplainInput(COFFEE_SOURCES).input;
const rival = (key: string, name: string) => ({
  key,
  name,
  answersNamingThem: 3,
  google: { reviewCount: "about_same", rating: "you_are_ahead", openDays: "they_are_ahead", sameCategory: true } as const,
});
const input: ExplainInput = {
  ...base,
  competitors: [rival("c1", "Clarke Kent Plumbing"), rival("c2", "Mr. Rooter Plumbing of Austin")],
  citations: {
    yourSiteCitedIn: 0,
    sites: [
      { domain: "abacusplumbing.com", kind: "business_site", owner: "Abacus Plumbing", answers: 12, answersWithoutYou: 12 },
      { domain: "yelp.com", kind: "listing", owner: null, answers: 8, answersWithoutYou: 8 },
      { domain: "coldisontheright.com", kind: "business_site", owner: null, answers: 8, answersWithoutYou: 8 },
      { domain: "statesman.com", kind: "news", owner: null, answers: 6, answersWithoutYou: 6 },
    ],
  },
};

describe("comparisonIssues (BUG-099)", () => {
  it("flags the reason that said a 4.9 rating was lower than the competitors' 4.5 and 4.8", () => {
    const evidence =
      "{you.rating} is lower than {c1.rating} at Clarke Kent Plumbing, {c2.rating} at Mr. Rooter Plumbing of Austin. All four are also open more days than you, {you.open_days} versus {c1.open_days}.";
    expect(comparisonIssues([evidence], input)).toEqual([
      "says Clarke Kent Plumbing is ahead on Google rating, but it is not",
      "says Mr. Rooter Plumbing of Austin is ahead on Google rating, but it is not",
    ]);
    expect(comparisonIssues(["Your Google profile trails competitors on rating and open days"], input)).toEqual([
      "says competitors are ahead on Google rating, but none is",
    ]);
  });

  it("passes true claims, and claims the business is ahead", () => {
    expect(comparisonIssues(["Clarke Kent Plumbing is open more days than you, {c1.open_days} versus {you.open_days}."], input)).toEqual([]);
    expect(comparisonIssues(["You have fewer open days than {c2.open_days} at Mr. Rooter Plumbing of Austin."], input)).toEqual([]);
    expect(comparisonIssues(["Your rating of {you.rating} is higher than {c1.rating} at Clarke Kent Plumbing."], input)).toEqual([]);
    expect(comparisonIssues(["Ask more happy customers for a Google review this week."], input)).toEqual([]);
  });

  it("does not split a sentence at Mr.", () => {
    expect(sentences("Rated {c2.rating} at Mr. Rooter. Next one.")).toEqual(["Rated {c2.rating} at Mr. Rooter", "Next one."]);
  });
});

describe("listingIssues (BUG-100)", () => {
  it("flags a listing check on another business's website or a news site", () => {
    expect(listingIssues(["Check your listing details on abchomeandcommercial.com and coldisontheright.com."], input)).toEqual([
      "asks for a listing on coldisontheright.com, which is another business's own website",
    ]);
    expect(listingIssues(["Search for your business name on yelp.com, abacusplumbing.com and statesman.com."], input)).toEqual([
      "asks for a listing on abacusplumbing.com, which is Abacus Plumbing's own website",
      "asks for a listing on statesman.com, which is a news site",
    ]);
  });

  it("passes a listing check on a listing site, and other advice about a business site", () => {
    expect(listingIssues(["Claim your listing on yelp.com and add photos."], input)).toEqual([]);
    expect(listingIssues(["AI quotes abacusplumbing.com, so give each service its own page on your site."], input)).toEqual([]);
  });
});
