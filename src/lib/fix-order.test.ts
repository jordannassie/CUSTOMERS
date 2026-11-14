import { describe, expect, it } from "vitest";
import { byImpactThenRank, rankOf } from "./fix-order";

describe("fix order", () => {
  it("reads the AI's rank, and nothing else, from evidence_data", () => {
    expect(rankOf({ rank: 2 })).toBe(2);
    expect(rankOf({ rank: 0 })).toBe(0);
    expect(rankOf({})).toBeNull();
    expect(rankOf(null)).toBeNull();
    expect(rankOf({ rank: "1" })).toBeNull();
    expect(rankOf([1])).toBeNull();
  });

  it("puts impact first, then the AI's order with unranked fixes last, then newest", () => {
    const fixes = [
      { id: "low", impact: "low", rank: 0, createdAt: "2026-10-01T00:00:00Z" },
      { id: "high-unranked-new", impact: "high", rank: null, createdAt: "2026-10-03T00:00:00Z" },
      { id: "high-unranked-old", impact: "high", createdAt: "2026-10-01T00:00:00Z" },
      { id: "high-2", impact: "high", rank: 2, createdAt: "2026-10-02T00:00:00Z" },
      { id: "high-0", impact: "high", rank: 0, createdAt: "2026-09-01T00:00:00Z" },
      { id: "odd", impact: "unknown", rank: 1, createdAt: "2026-10-01T00:00:00Z" },
      { id: "medium", impact: "medium", rank: 3, createdAt: "2026-10-01T00:00:00Z" },
    ];
    expect([...fixes].sort(byImpactThenRank).map((f) => f.id)).toEqual(["high-0", "high-2", "high-unranked-new", "high-unranked-old", "odd", "medium", "low"]);
  });
});
