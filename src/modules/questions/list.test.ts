import { describe, expect, it } from "vitest";
import { questionsHref } from "@/lib/questions-href";
import { questionsCsv, csvCell } from "./csv";
import { filterCounts, inFilter, namedPercent, questionKpis, skippedSites, topicsOf, topPick, visibleRows } from "./list";
import type { QuestionRow } from "./service";

const row = (id: string, over: Partial<QuestionRow> = {}): QuestionRow => ({
  id,
  text: `Question ${id}?`,
  active: true,
  custom: false,
  topic: null,
  results: [],
  named: 0,
  answers: 0,
  trend: null,
  matches: true,
  summary: null,
  ...over,
});

const named = row("named", { named: 2, answers: 6, topic: "Delivery", trend: "up" });
const never = row("never", { named: 0, answers: 6, topic: "delivery ", trend: "down" });
const fresh = row("fresh", { topic: "Price" });

describe("filters", () => {
  it("named you, never named (checked only) and getting worse", () => {
    expect([named, never, fresh].filter((r) => inFilter(r, "named")).map((r) => r.id)).toEqual(["named"]);
    expect([named, never, fresh].filter((r) => inFilter(r, "never")).map((r) => r.id)).toEqual(["never"]);
    expect([named, never, fresh].filter((r) => inFilter(r, "worse")).map((r) => r.id)).toEqual(["never"]);
    expect(filterCounts([named, never, fresh], null)).toEqual({ all: 3, named: 1, never: 1, worse: 1 });
    expect(filterCounts([named, never, fresh], "DELIVERY")).toEqual({ all: 2, named: 1, never: 1, worse: 1 });
  });

  it("lists each topic once, first spelling, A to Z", () => {
    expect(topicsOf([named, never, fresh, row("x")])).toEqual(["Delivery", "Price"]);
  });

  it("keeps a linked question whatever the filters, and drops rows a link leaves out", () => {
    const off = row("off", { matches: false });
    expect(visibleRows([named, never, off], { filter: "named", topic: null }).map((r) => r.id)).toEqual(["named"]);
    expect(visibleRows([named, never, off], { filter: "named", topic: null, keepId: "off" }).map((r) => r.id)).toEqual(["named", "off"]);
    expect(visibleRows([named, never, fresh], { filter: "all", topic: "price" }).map((r) => r.id)).toEqual(["fresh"]);
  });
});

describe("numbers and row facts", () => {
  it("counts the active questions that named you at least once and never", () => {
    expect(questionKpis([named, never, fresh], 2)).toEqual({ active: 3, paused: 2, checked: 2, namedOnce: 1, neverNamed: 1 });
  });

  it("gives the named share, top pick and the sites that skipped you", () => {
    expect(namedPercent(named)).toBe(33);
    expect(namedPercent(fresh)).toBeNull();
    const summary = {
      answers: 6,
      you: 2,
      named: [{ name: "Bean House", answers: 4, tracked: true, competitorId: "c1" }],
      sitesWithoutYou: [
        { host: "yelp.com", answers: 4 },
        { host: "bbb.org", answers: 3 },
        { host: "maps.google.com", answers: 2 },
      ],
    };
    expect(topPick({ summary })?.name).toBe("Bean House");
    expect(skippedSites({ summary }, 2)).toEqual(["yelp.com", "bbb.org"]);
    expect(skippedSites({ summary: { ...summary, you: 6 } })).toEqual([]);
    expect(topPick({ summary: null })).toBeNull();
  });
});

describe("CSV", () => {
  it("writes the visible rows with each AI as x of N", () => {
    const r = row("a", {
      text: 'Best "cheap" pizza, in Orange?',
      topic: "Price",
      named: 1,
      answers: 4,
      results: [
        { model: "openai", label: "ChatGPT", appeared: 1, checks: 2, pips: [false, true] },
        { model: "anthropic", label: "Claude", appeared: 0, checks: 0, pips: [] },
      ],
      summary: { answers: 4, you: 1, named: [{ name: "Slice Theory", answers: 3, tracked: false }], sitesWithoutYou: [] },
    });
    const csv = questionsCsv([r], [
      { id: "openai", label: "ChatGPT" },
      { id: "anthropic", label: "Claude" },
    ]);
    expect(csv.split("\r\n")).toEqual([
      "Question,Topic,Status,Named you (%),ChatGPT (named you),Claude (named you),Top pick",
      '"Best ""cheap"" pizza, in Orange?",Price,Active,25,1 of 2,Not checked yet,Slice Theory',
    ]);
  });

  it("keeps a cell from running as a formula", () => {
    expect(csvCell("=HYPERLINK(1)")).toBe("'=HYPERLINK(1)");
    expect(csvCell(null)).toBe("");
  });
});

describe("questionsHref", () => {
  it("builds the page's links", () => {
    expect(questionsHref()).toBe("/questions");
    expect(questionsHref({ q: "abc" })).toBe("/questions?q=abc");
    expect(questionsHref({ site: "yelp.com", named: "Bean & Co" })).toBe("/questions?site=yelp.com&named=Bean+%26+Co");
  });
});
