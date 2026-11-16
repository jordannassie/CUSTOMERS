import { describe, expect, it } from "vitest";
import { rankTile } from "./rank-tile";

const you = { name: "You", isYou: true, mentions: 0, score: 0 };
const rival = (name: string) => ({ name, isYou: false, mentions: 3, score: 20 });

describe("rankTile", () => {
  it("says no competitors are tracked instead of a rank of None", () => {
    expect(rankTile({ rank: null, businesses: [you] })).toEqual({ label: "Competitors tracked", value: "None", note: "Add them in Competitors to compare" });
  });

  it("says nobody was named yet when competitors are tracked but there is no rank", () => {
    expect(rankTile({ rank: null, businesses: [you, rival("A"), rival("B")] })).toMatchObject({ label: "Rank among 3 tracked", value: "None", note: "No tracked business was named" });
  });

  it("keeps the rank and leader otherwise", () => {
    expect(rankTile({ rank: { position: 2, of: 3, leader: { name: "A", score: 40 } }, businesses: [you, rival("A"), rival("B")] })).toEqual({
      label: "Rank among 3 tracked",
      value: "#2",
      note: "Leader: A, 40",
    });
  });
});
