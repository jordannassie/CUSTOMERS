import { describe, expect, it } from "vitest";
import { byWhere, competitorsIn, whereOf } from "./where";

const fix = (category: string | null, text: string, claudePrompt: string | null = null) => ({ category, text, claudePrompt });

describe("whereOf", () => {
  it("puts website changes, and anything with a Copy for Claude prompt, under your website", () => {
    expect(whereOf(fix("service_page", "Add a tire sales page"))).toBe("website");
    expect(whereOf(fix("competitor_gap", "Bean Tires lists more services", "Draft a page"))).toBe("website");
  });

  it("puts Google reviews, hours and profile fixes under your Google listing", () => {
    expect(whereOf(fix("reviews_reputation", "Ask customers for Google reviews"))).toBe("google_listing");
    expect(whereOf(fix("local_presence", "Add your hours to your Google Business Profile"))).toBe("google_listing");
    expect(whereOf(fix("competitor_gap", "They have more reviews on Google"))).toBe("google_listing");
  });

  it("puts review sites and directories under other places AI looks", () => {
    expect(whereOf(fix("citations", "AI cites Yelp and you were not named. Check your Yelp listing."))).toBe("other_places");
    expect(whereOf(fix("reviews_reputation", "Get reviews on Yelp"))).toBe("other_places");
    expect(whereOf(fix("entity_consistency", "Use the same name on every directory"))).toBe("other_places");
  });

  it("falls back to your website when nothing says otherwise", () => {
    expect(whereOf(fix(null, "AI assistants leave you out of most answers"))).toBe("website");
  });
});

describe("competitorsIn", () => {
  it("finds whole tracked names only", () => {
    expect(competitorsIn("AI picks Bean Tires more often", ["Bean Tires", "Bean", "Joe's"])).toEqual(["Bean Tires", "Bean"]);
    expect(competitorsIn("Beanstalk Tires", ["Bean"])).toEqual([]);
  });
});

describe("byWhere", () => {
  it("leads with the group holding the most important fix and keeps card order", () => {
    const items = [
      { id: "a", where: "website" as const, impact: "medium" as const },
      { id: "b", where: "google_listing" as const, impact: "high" as const },
      { id: "c", where: "website" as const, impact: "low" as const },
    ];
    expect(byWhere(items).map((g) => [g.where, g.items.map((i) => i.id)])).toEqual([
      ["google_listing", ["b"]],
      ["website", ["a", "c"]],
    ]);
  });
});
