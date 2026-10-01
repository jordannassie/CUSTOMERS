import { describe, expect, it } from "vitest";
import { pickedInstead } from "./picked";
import type { LeaderRow } from "./service";

const row = (name: string, score: number | null, standing: LeaderRow["standing"], extra: Partial<LeaderRow> = {}): LeaderRow => ({
  name,
  isYou: false,
  score,
  standing,
  change: null,
  collecting: false,
  shade: null,
  ...extra,
});
const you = (score: number) => row("Sunrise Coffee Bar", score, null, { isYou: true });
const view = (leaderboard: LeaderRow[]) => ({ hasScore: true, leaderboard, margin: 6 });

describe("pickedInstead (DB-004)", () => {
  it("shows the top competitor, you and the next one, with how often each was named, never a rank", () => {
    const picked = pickedInstead(
      view([row("Bean House", 72, "behind"), row("Daily Grind", 58, "behind"), you(47), row("Corner Cup", 30, "ahead"), row("Lakeside", 12, "ahead")]),
    );
    expect(picked!.rows.map((r) => r.name)).toEqual(["Bean House", "Sunrise Coffee Bar", "Corner Cup"]);
    expect(picked!.sentence).toBe("Bean House was named in about 7 of 10 answers, you in about 5.");
    expect(picked!.sentence).not.toMatch(/\d(st|nd|rd|th)\b/);
  });

  it("never calls a gap inside the margin a lead", () => {
    const picked = pickedInstead(view([row("Bean House", 52, "about_same"), you(47)]));
    expect(picked!.sentence).toBe("Bean House was named about as often as you, in about 5 of 10 answers.");
  });

  it("says when you lead, kept to the competitors compared so far", () => {
    expect(pickedInstead(view([you(66), row("Bean House", 30, "ahead")]))!.sentence).toBe(
      "You were named more often than your competitors, in about 7 of 10 answers.",
    );
    const withNew = view([you(66), row("Bean House", 30, "ahead"), row("New Cafe", 80, null, { collecting: true })]);
    expect(pickedInstead(withNew)!.sentence).toBe("You were named more often than the competitors compared so far, in about 7 of 10 answers.");
    expect(pickedInstead(withNew)!.rows.map((r) => r.name)).toEqual(["Sunrise Coffee Bar", "Bean House"]);
  });

  it("on a zero score, names the business AI picked instead", () => {
    const picked = pickedInstead(view([row("Bean House", 58, "behind"), you(0)]));
    expect(picked).toMatchObject({ notNamed: true, sentence: "AI did not name you yet. It named Bean House in about 6 of 10 answers." });
  });

  it("is null before a score or with no compared competitor", () => {
    expect(pickedInstead({ hasScore: false, leaderboard: [], margin: null })).toBeNull();
    expect(pickedInstead(view([you(40), row("New Cafe", null, null)]))).toBeNull();
  });
});
