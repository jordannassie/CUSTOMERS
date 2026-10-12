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
  it("shows the top three as named, never skipping one ahead of you, and never a rank (BUG-112)", () => {
    const picked = pickedInstead(
      view([row("Bean House", 72, "behind"), row("Daily Grind", 58, "behind"), you(47), row("Corner Cup", 30, "ahead"), row("Lakeside", 12, "ahead")]),
    );
    expect(picked!.rows.map((r) => r.name)).toEqual(["Bean House", "Daily Grind", "Sunrise Coffee Bar"]);
    expect(picked!.sentence).toBe("Bean House was named in about 7 of 10 answers, you in about 5.");
    expect(picked!.sentence).not.toMatch(/\d(st|nd|rd|th)\b/);
  });

  it("adds you below the top three when you're further down", () => {
    const picked = pickedInstead(
      view([row("Bean House", 72, "behind"), row("Daily Grind", 58, "behind"), row("Corner Cup", 50, "behind"), row("Lakeside", 49, "behind"), you(20)]),
    );
    expect(picked!.rows.map((r) => r.name)).toEqual(["Bean House", "Daily Grind", "Corner Cup", "Sunrise Coffee Bar"]);
  });

  it("never calls a gap inside the margin a lead", () => {
    const picked = pickedInstead(view([row("Bean House", 52, "about_same"), you(47)]));
    expect(picked!.sentence).toBe("Bean House was named about as often as you, in about 5 of 10 answers.");
  });

  it("names both when far apart but inside the margin, never 'about as often' (BUG-111)", () => {
    expect(pickedInstead(view([you(28), row("Mozart's Coffee Roasters", 11, "about_same")]))!.sentence).toBe(
      "You were named in about 3 of 10 answers, Mozart's Coffee Roasters in about 1. There aren't enough answers yet to say that gap will hold.",
    );
    expect(pickedInstead(view([row("Bean House", 40, "about_same"), you(20)]))!.sentence).toBe(
      "Bean House was named in about 4 of 10 answers, you in about 2. There aren't enough answers yet to say that gap will hold.",
    );
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

  it("names the chain AI named when a tracked branch's answers named only the chain", () => {
    const chain = { brand: "Bennu Coffee", tracked: ["Bennu Coffee on Congress"] };
    const picked = pickedInstead(view([row("Bennu Coffee on Congress", 25, "behind", { chain }), you(8)]));
    expect(picked!.sentence).toBe("Bennu Coffee was named in about 3 of 10 answers, you in about 1.");
  });

  it("is null before a score or with no compared competitor", () => {
    expect(pickedInstead({ hasScore: false, leaderboard: [], margin: null })).toBeNull();
    expect(pickedInstead(view([you(40), row("New Cafe", null, null)]))).toBeNull();
  });
});
