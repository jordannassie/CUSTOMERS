import { describe, expect, it } from "vitest";
import { actionRow, defaultWhereToApply, placeOf, statusUpdate, toActionItems, toActionStatus, toDbActionStatus, type ActionRow } from "./service";

const row = (over: Partial<ActionRow>): ActionRow => ({
  id: "a",
  title: "Fix",
  impact: "medium",
  status: "open",
  category: "content",
  description: null,
  evidence: null,
  recommended_action: null,
  claude_prompt: null,
  affected_url: null,
  created_at: "2026-10-20T00:00:00Z",
  usesGoogle: false,
  ...over,
});

describe("statuses", () => {
  it("maps the saved values to the board's columns and back", () => {
    expect(["open", "todo", "in_progress", "resolved", "dismissed"].map(toActionStatus)).toEqual(["suggested", "todo", "in_progress", "done", "dismissed"]);
    expect(toDbActionStatus("done")).toBe("resolved");
    expect(toDbActionStatus("suggested")).toBe("open");
  });

  it("stamps the done date, and clears it when a fix moves back", () => {
    const now = new Date("2026-10-27T10:00:00Z");
    expect(statusUpdate("done", now)).toMatchObject({ status: "resolved", completed_at: now.toISOString() });
    expect(statusUpdate("todo", now)).toMatchObject({ status: "todo", completed_at: null });
  });
});

describe("where to apply", () => {
  it("names the place to open", () => {
    expect(placeOf("other_places", "citations", "Claim your Yelp listing on yelp.com")).toBe("review_sites");
    expect(placeOf("other_places", "citations", "Post on TikTok")).toBe("social");
    expect(placeOf("website", "content", "Write a page")).toBe("content");
    expect(defaultWhereToApply("review_sites", "Claim your listing on www.yelp.com", null)).toBe("yelp.com");
    expect(defaultWhereToApply("google_listing", "", null)).toBe("Google Business Profile");
    expect(defaultWhereToApply("website", "", "https://x.com/menu")).toBe("Website · /menu");
  });
});

describe("toActionItems", () => {
  it("leaves out checklist ticks and puts high impact first", () => {
    const items = toActionItems(
      [row({ id: "low", impact: "low" }), row({ id: "high", impact: "high" }), row({ id: "tick", affected_url: "checklist:hours" })],
      [],
      null,
    );
    expect(items.map((i) => i.id)).toEqual(["high", "low"]);
  });

  it("keeps a saved where to apply, and says which are assigned to you", () => {
    const [item] = toActionItems([row({ where_to_apply: "cheezious.com home page", assignee_id: "u1", source: "comparison" })], [], "u1");
    expect(item).toMatchObject({ whereToApply: "cheezious.com home page", assignedToYou: true, source: "comparison" });
  });
});

describe("actionRow", () => {
  it("starts an added fix in To do, with its key", () => {
    expect(
      actionRow("b", {
        title: "Claim your Yelp listing",
        fact: "AI used yelp.com in 9 answers without you.",
        whatToDo: "Claim it.",
        whereToApply: "yelp.com",
        impact: "high",
        category: "citations",
        source: "comparison",
        dedupeKey: "site:yelp.com",
      }),
    ).toMatchObject({ status: "todo", dedupe_key: "site:yelp.com", source: "comparison", where_to_apply: "yelp.com" });
  });
});
