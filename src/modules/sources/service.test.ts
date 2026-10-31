import { describe, expect, it } from "vitest";
import { MAX_SITES, answersText, citedHosts, mentionsYou, sourcesView, uniqueAnswers, type SourceCheck } from "./service";

const OWN = "beantherecoffee.example";
const ctx = { ownDomain: OWN, businessName: "Bean There Coffee" };
const at = (day: number) => `2026-09-${String(day).padStart(2, "0")}T10:00:00.000Z`;
const check = (provider: string, urls: string[], day = 20, extra: Partial<SourceCheck> = {}): SourceCheck => ({
  provider,
  citations: urls.map((url) => ({ url, title: null })),
  checkedAt: at(day),
  ...extra,
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

describe("uniqueAnswers", () => {
  it("counts a cached answer once, like the score", () => {
    const a = check("openai", ["https://yelp.com"], 20, { answerKey: "k1" });
    const again = check("openai", ["https://yelp.com"], 21, { answerKey: "k1" });
    const other = check("openai", ["https://yelp.com"], 21, { answerKey: "k2" });
    expect(uniqueAnswers([a, again, other])).toEqual([a, other]);
    expect(sourcesView([a, again, other], ctx).answers).toBe(2);
  });
});

describe("sourcesView", () => {
  it("is empty when there are no checks yet", () => {
    expect(sourcesView([], ctx)).toEqual({
      answers: 0,
      answersAllTools: 0,
      answersWithSources: 0,
      ownSite: { host: OWN, answers: 0 },
      types: [],
      sites: [],
      moreSites: 0,
      lastCheckedAt: null,
      sitesUsed: 0,
      topSource: null,
      topMentioning: { count: 0, of: 0, hosts: [] },
      competitorSiteTimes: 0,
    });
  });

  it("keeps the answer count when a first scan cited nothing", () => {
    const view = sourcesView([check("openai", []), check("anthropic", [], 21)], ctx);
    expect(view.answers).toBe(2);
    expect(view.answersWithSources).toBe(0);
    expect(view.sites).toEqual([]);
    expect(view.lastCheckedAt).toBe(at(21));
  });

  it("ranks sites by how many answers cited them, with the AIs that did and their kinds", () => {
    const view = sourcesView(
      [
        check("openai", ["https://www.yelp.com/biz/a", "https://patch.com/x"]),
        check("perplexity", ["https://yelp.com/biz/b", "https://beantherecoffee.example/menu"], 20, { mentioned: true }),
        check("anthropic", ["https://yelp.com/c", "https://www.yelp.com/d"]),
        check("openai", []),
      ],
      { ownDomain: "https://www.beantherecoffee.example" },
    );
    expect(view.answers).toBe(4);
    expect(view.answersWithSources).toBe(3);
    expect(view.sites.map((s) => [s.host, s.typeLabel, s.kindLabel, s.answers, s.answersWithoutYou, s.models, s.mentions])).toEqual([
      ["yelp.com", "Reviews and forums", "Reviews", 3, 2, ["openai", "anthropic", "perplexity"], "sometimes"],
      ["beantherecoffee.example", "Your website", "Your website", 1, 0, ["perplexity"], "own"],
      ["patch.com", "News", "News", 1, 1, ["openai"], "no"],
    ]);
    expect(view.ownSite).toEqual({ host: "beantherecoffee.example", answers: 1 });
    expect(view.types).toEqual([
      { type: "reviews", label: "Reviews and forums", sites: 1, answers: 3, kinds: ["review sites"] },
      { type: "news", label: "News", sites: 1, answers: 1, kinds: ["news"] },
      { type: "own", label: "Your website", sites: 1, answers: 1, kinds: [] },
    ]);
    expect(view.sitesUsed).toBe(3);
    expect(view.topSource).toEqual({ host: "yelp.com", answers: 3 });
    // The own site is left out of "top sources that mention you".
    expect(view.topMentioning).toEqual({ count: 1, of: 2, hosts: ["yelp.com"] });
  });

  it("counts an answer once per type even when it cites two sites of that type", () => {
    const view = sourcesView([check("openai", ["https://yelp.com/a", "https://reddit.com/r/oc"])], ctx);
    expect(view.types).toEqual([{ type: "reviews", label: "Reviews and forums", sites: 2, answers: 1, kinds: ["review sites"] }]);
  });

  it("lists the kinds inside a category", () => {
    const view = sourcesView([check("openai", ["https://foodpanda.pk/x", "https://thecookbook.pk/best"])], ctx);
    expect(view.types[0]).toMatchObject({ type: "business", sites: 2, kinds: ["delivery apps", "food guides"] });
  });

  it("reports no own site when the business has no website", () => {
    const view = sourcesView([check("openai", ["https://yelp.com/a"])], { ownDomain: null });
    expect(view.ownSite).toEqual({ host: null, answers: 0 });
  });

  it("shows the top sites and says how many more there are", () => {
    const urls = Array.from({ length: MAX_SITES + 3 }, (_, i) => `https://site${i}.example/`);
    const view = sourcesView([check("openai", urls)], ctx);
    expect(view.sites).toHaveLength(MAX_SITES);
    expect(view.moreSites).toBe(3);
    expect(view.sitesUsed).toBe(MAX_SITES + 3);
  });

  it("finds competitor sites from tracked competitors and from businesses AI named", () => {
    const competitors = [{ id: "c1", name: "Daily Grind", domain: "https://dailygrind.example", aliases: [] }];
    const view = sourcesView(
      [
        check("openai", ["https://dailygrind.example/", "https://jfcpizza.com/"], 20, { names: ["JFC Pizza", "Daily Grind"] }),
        check("anthropic", ["https://order.dailygrind.example/", "https://yelp.com/x"], 20, { names: ["Bean There Coffee"], mentioned: true }),
      ],
      { ...ctx, competitors },
    );
    const byHost = Object.fromEntries(view.sites.map((s) => [s.host, s]));
    expect(byHost["dailygrind.example"]).toMatchObject({ kind: "competitor", mentions: "competitor", competitorId: "c1" });
    expect(byHost["order.dailygrind.example"]).toMatchObject({ kind: "competitor", competitorId: "c1" });
    expect(byHost["jfcpizza.com"]).toMatchObject({ kind: "competitor", competitorId: null, names: ["Daily Grind", "JFC Pizza"] });
    expect(byHost["yelp.com"]).toMatchObject({ kind: "reviews", mentions: "always", names: ["Bean There Coffee"] });
    expect(view.competitorSiteTimes).toBe(3);
  });

  it("filters every number to one AI tool, but keeps the kinds", () => {
    const checks = [
      check("openai", ["https://yelp.com/a", "https://beantherecoffee.example/"], 20, { mentioned: true }),
      check("anthropic", ["https://yelp.com/b", "https://jfcpizza.com/"], 20, { names: ["JFC Pizza"] }),
      check("anthropic", [], 21),
    ];
    const claude = sourcesView(checks, { ...ctx, tool: "anthropic" });
    expect(claude.answers).toBe(2);
    expect(claude.answersAllTools).toBe(3);
    expect(claude.ownSite.answers).toBe(0);
    expect(claude.sites.map((s) => [s.host, s.answers, s.models, s.kind])).toEqual([
      ["jfcpizza.com", 1, ["anthropic"], "competitor"],
      ["yelp.com", 1, ["anthropic"], "reviews"],
    ]);
    const chatgpt = sourcesView(checks, { ...ctx, tool: "openai" });
    expect(chatgpt.answers).toBe(1);
    expect(chatgpt.ownSite.answers).toBe(1);
    expect(chatgpt.sites.find((s) => s.host === "yelp.com")?.mentions).toBe("always");
  });

  it("names the businesses those answers named most, most named first", () => {
    const view = sourcesView(
      [
        check("openai", ["https://yelp.com/a"], 20, { names: ["Pizza Hut", "Domino's"] }),
        check("openai", ["https://yelp.com/b"], 21, { names: ["Domino's"] }),
        check("openai", ["https://yelp.com/c"], 22, { names: ["Slice Theory", "Domino's", "Pizza Hut"] }),
      ],
      ctx,
    );
    expect(view.sites[0].names).toEqual(["Domino's", "Pizza Hut"]);
  });
});

describe("mentionsYou", () => {
  it("says No, Sometimes or Always from the answers that named you", () => {
    expect(mentionsYou("reviews", 5, 5)).toBe("no");
    expect(mentionsYou("reviews", 5, 2)).toBe("sometimes");
    expect(mentionsYou("reviews", 5, 0)).toBe("always");
    expect(mentionsYou("competitor", 5, 0)).toBe("competitor");
    expect(mentionsYou("own", 5, 5)).toBe("own");
  });
});

describe("answersText", () => {
  it("uses digits and the right plural", () => {
    expect(answersText(3, 36)).toBe("3 of 36 answers");
    expect(answersText(1, 1)).toBe("1 of 1 answer");
  });
});
