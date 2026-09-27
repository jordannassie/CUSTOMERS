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
  it("replaces open opportunities and does not bring back ones the user dismissed or finished", () => {
    const plan = planSave(
      [
        { id: "a", title: "Old open one", status: "open" },
        { id: "b", title: "Get more reviews", status: "dismissed" },
        { id: "c", title: "Fix your hours", status: "resolved" },
      ],
      [draft("Get more reviews"), draft("Add an FAQ"), draft("add an faq")],
    );
    expect(plan).toEqual({ insert: [draft("Add an FAQ")], removeIds: ["a"] });
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
