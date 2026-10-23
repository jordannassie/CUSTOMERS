import { describe, expect, it } from "vitest";
import { MAX_SITES, answersText, citedHosts, sourcesView, type SourceCheck } from "./service";

const OWN = "beantherecoffee.example";
const at = (day: number) => `2026-09-${String(day).padStart(2, "0")}T10:00:00.000Z`;
const check = (provider: string, urls: string[], day = 20): SourceCheck => ({
  provider,
  citations: urls.map((url) => ({ url, title: null })),
  checkedAt: at(day),
});

describe("citedHosts", () => {
  it("counts a site once per answer however many pages were linked", () => {
    expect(
      citedHosts([
        { url: "https://www.yelp.com/biz/a", title: "A" },
        { url: "https://yelp.com/biz/b", title: null },
        { url: "https://patch.com/x", title: null },
      ]),
    ).toEqual(["yelp.com", "patch.com"]);
  });

  it("skips bad values instead of failing", () => {
    expect(citedHosts(null)).toEqual([]);
    expect(citedHosts({ url: "https://yelp.com" })).toEqual([]);
    expect(citedHosts([null, 3, { url: 5 }, { url: "javascript:alert(1)" }, "https://bbb.org/x"])).toEqual(["bbb.org"]);
  });
});

describe("sourcesView", () => {
  it("is empty when there are no checks yet", () => {
    expect(sourcesView([], OWN)).toEqual({
      answers: 0,
      answersWithSources: 0,
      ownSite: { host: OWN, answers: 0 },
      types: [],
      sites: [],
      moreSites: 0,
      lastCheckedAt: null,
    });
  });

  it("keeps the answer count when a first scan cited nothing", () => {
    const view = sourcesView([check("openai", []), check("anthropic", [], 21)], OWN);
    expect(view.answers).toBe(2);
    expect(view.answersWithSources).toBe(0);
    expect(view.sites).toEqual([]);
    expect(view.lastCheckedAt).toBe(at(21));
  });

  it("ranks sites by how many answers cited them, with the AIs that did", () => {
    const view = sourcesView(
      [
        check("openai", ["https://www.yelp.com/biz/a", "https://patch.com/x"]),
        check("perplexity", ["https://yelp.com/biz/b", "https://beantherecoffee.example/menu"]),
        check("anthropic", ["https://yelp.com/c", "https://www.yelp.com/d"]),
        check("openai", []),
      ],
      "https://www.beantherecoffee.example",
    );
    expect(view.answers).toBe(4);
    expect(view.answersWithSources).toBe(3);
    expect(view.sites).toEqual([
      { host: "yelp.com", type: "reviews", typeLabel: "Reviews and forums", answers: 3, models: ["openai", "anthropic", "perplexity"] },
      { host: "beantherecoffee.example", type: "own", typeLabel: "Your website", answers: 1, models: ["perplexity"] },
      { host: "patch.com", type: "news", typeLabel: "News", answers: 1, models: ["openai"] },
    ]);
    expect(view.ownSite).toEqual({ host: "beantherecoffee.example", answers: 1 });
    expect(view.types).toEqual([
      { type: "reviews", label: "Reviews and forums", sites: 1, answers: 3 },
      { type: "news", label: "News", sites: 1, answers: 1 },
      { type: "own", label: "Your website", sites: 1, answers: 1 },
    ]);
  });

  it("counts an answer once per type even when it cites two sites of that type", () => {
    const view = sourcesView([check("openai", ["https://yelp.com/a", "https://reddit.com/r/oc"])], OWN);
    expect(view.types).toEqual([{ type: "reviews", label: "Reviews and forums", sites: 2, answers: 1 }]);
  });

  it("reports no own site when the business has no website", () => {
    const view = sourcesView([check("openai", ["https://yelp.com/a"])], null);
    expect(view.ownSite).toEqual({ host: null, answers: 0 });
  });

  it("shows the top sites and says how many more there are", () => {
    const urls = Array.from({ length: MAX_SITES + 3 }, (_, i) => `https://site${i}.example/`);
    const view = sourcesView([check("openai", urls)], OWN);
    expect(view.sites).toHaveLength(MAX_SITES);
    expect(view.moreSites).toBe(3);
  });
});

describe("answersText", () => {
  it("uses digits and the right plural", () => {
    expect(answersText(3, 36)).toBe("3 of 36 answers");
    expect(answersText(1, 1)).toBe("1 of 1 answer");
  });
});
