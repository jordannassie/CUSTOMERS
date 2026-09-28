import { describe, expect, it } from "vitest";
import { fromDbStatus, splitSteps, toDbStatus, toItems, type OpportunityRow } from "./service";

const row = (id: string, impact: string, created: string, extra: Partial<OpportunityRow> = {}): OpportunityRow => ({
  id,
  title: `Fix ${id}`,
  impact,
  status: "open",
  description: null,
  evidence: null,
  recommended_action: null,
  claude_prompt: null,
  created_at: created,
  usesGoogle: false,
  ...extra,
});

describe("opportunities service", () => {
  it("sorts by impact, then newest first", () => {
    const items = toItems([
      row("a", "low", "2026-09-01"),
      row("b", "high", "2026-09-01"),
      row("c", "medium", "2026-09-02"),
      row("d", "high", "2026-09-03"),
    ]);
    expect(items.map((i) => i.id)).toEqual(["d", "b", "c", "a"]);
  });

  it("maps the table's legacy statuses to open, done and dismissed", () => {
    expect(["open", "in_progress", "resolved", "dismissed"].map(fromDbStatus)).toEqual(["open", "open", "done", "dismissed"]);
    expect(toDbStatus("done")).toBe("resolved");
    expect(toDbStatus("open")).toBe("open");
  });

  it("splits numbered steps and keeps an old paragraph as one step", () => {
    expect(splitSteps("1. Ask for reviews.\n2. Reply to them.\n")).toEqual(["Ask for reviews.", "Reply to them."]);
    expect(splitSteps("Publish a services page.")).toEqual(["Publish a services page."]);
    expect(splitSteps(null)).toEqual([]);
  });

  it("returns only the fields the screen needs, with empty text as null", () => {
    const [item] = toItems([row("a", "weird", "2026-09-01", { evidence: "  ", claude_prompt: "Write a page." })]);
    expect(item).toEqual({
      id: "a",
      title: "Fix a",
      impact: "medium",
      status: "open",
      evidence: null,
      whyItMatters: null,
      steps: [],
      claudePrompt: "Write a page.",
      usesGoogle: false,
    });
  });
});
