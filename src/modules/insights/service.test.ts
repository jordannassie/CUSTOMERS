import { describe, expect, it } from "vitest";
import type { OpportunityDraft } from "./explain";
import { BEAN_HOUSE_ID, COFFEE_SIGNALS } from "./fixtures";
import { fillOpportunity, liveLookup, planSave, referencedCompetitors, usageCostUsd } from "./service";

const draft = (title: string): OpportunityDraft => ({
  title,
  description: "Why.",
  evidence: "Facts.",
  impact: "medium",
  category: "content",
  recommended_action: "1. Do it.",
  claude_prompt: null,
});

describe("insights service", () => {
  const row = (id: string, title: string, status = "open", source = "scan", affected_url: string | null = null) => ({ id, title, status, source, affected_url });

  it("rewrites open scan fixes in place, adds new ones, removes the rest, and never brings back ones the user dismissed or finished", () => {
    const plan = planSave(
      [
        row("a", "Old open one"),
        row("b", "Get more reviews", "dismissed"),
        row("c", "Fix your hours", "resolved"),
        row("d", "Add a menu page"),
      ],
      [draft("Get more reviews"), draft("Add an FAQ"), draft("add an faq"), draft("Add a Menu Page ")],
    );
    expect(plan).toEqual({ insert: [draft("Add an FAQ")], update: [{ id: "d", draft: draft("Add a Menu Page ") }], removeIds: ["a"] });
  });

  it("matches a stored title the writer reworded as 'questions we track'", () => {
    const plan = planSave([row("a", "Named in 3 questions we track")], [draft("Named in 3 sample questions we tracked")]);
    expect(plan).toEqual({ insert: [], update: [{ id: "a", draft: draft("Named in 3 sample questions we tracked") }], removeIds: [] });
  });

  it("leaves fixes from Compare, Sources or by hand, accepted fixes and checklist items alone", () => {
    const existing = [
      row("cmp", "List on Yelp", "open", "comparison"),
      row("todo", "Add an FAQ", "todo"),
      row("chk", "Get your first 10 reviews", "resolved", "scan", "checklist:reviews"),
      row("gone", "Old open one"),
    ];
    const plan = planSave(existing, [draft("List on Yelp"), draft("Add an FAQ"), draft("Get your first 10 reviews")]);
    expect(plan).toEqual({ insert: [], update: [], removeIds: ["gone"] });
  });

  it("removes a duplicate open scan fix when the same title was already taken up", () => {
    const plan = planSave([row("todo", "Add an FAQ", "todo"), row("dup", "Add an FAQ")], [draft("Add an FAQ")]);
    expect(plan).toEqual({ insert: [], update: [], removeIds: ["dup"] });
  });

  it("fills stored placeholders from live Google values", () => {
    const row = { ...draft("x"), evidence: `Bean House has {competitor.${BEAN_HOUSE_ID}.review_count} reviews. You have {business.review_count}.` };
    expect([...referencedCompetitors([row])]).toEqual([BEAN_HOUSE_ID]);
    const lookup = liveLookup("ChIJ-fixture-sunrise-coffee", new Map([[BEAN_HOUSE_ID, "ChIJ-fixture-bean-house"]]), COFFEE_SIGNALS);
    expect(fillOpportunity(row, lookup).evidence).toBe("Bean House has 320 reviews. You have 12.");
    const removed = liveLookup("ChIJ-fixture-sunrise-coffee", new Map(), COFFEE_SIGNALS);
    expect(fillOpportunity(row, removed).evidence).toBe("You have 12.");
  });

  it("prices Sonnet 5 usage", () => {
    expect(usageCostUsd({ inputTokens: 10_000, outputTokens: 2_000 })).toBe(0.04);
  });
});
