import { describe, expect, it } from "vitest";
import type { ScoreReport } from "@/modules/scanning";
import { FIXTURE_SIGNALS } from "./place-fixtures";
import { toSignals } from "./places";
import {
  competitorsView,
  headToHead,
  hoursText,
  matchedNone,
  reviewsText,
  websiteLabel,
  type CompetitorRow,
  type SignalResult,
} from "./service";

const FIRST_SCAN = new Date("2026-08-25T12:00:00Z");
const LAST_SCAN = new Date("2026-09-20T12:00:00Z");
const BEFORE = new Date("2026-08-20T12:00:00Z");

function report(overall: { score: number; margin: number } | null, competitors: ScoreReport["competitors"] = []): ScoreReport {
  return {
    overall: overall && { ...overall, checks: 90, uniqueAnswers: 60, confidence: "good" },
    byModel: [],
    models: ["openai", "anthropic", "perplexity"],
    trend: [],
    history: [],
    monthChange: null,
    modelChanges: {},
    change: null,
    firstCheckedAt: overall ? FIRST_SCAN : null,
    lastCheckedAt: overall ? LAST_SCAN : null,
    competitors,
    questions: [],
  };
}

const row = (name: string, placesId: string | null = null, createdAt = BEFORE): CompetitorRow => ({ name, placesId, createdAt });
const noAlso = { names: [], answers: 0 };
const view = (r: ScoreReport, competitors: CompetitorRow[], signals = new Map<string, SignalResult>()) =>
  competitorsView({
    business: { name: "Sunrise Coffee Bar", placesId: "ChIJ-fixture-sunrise-coffee" },
    report: r,
    competitors,
    signals,
    also: noAlso,
    limit: 5,
  });

describe("leaderboard", () => {
  it("orders by score with you in place, and shades the strongest competitor darkest", () => {
    const v = view(
      report({ score: 41.4, margin: 6.6 }, [
        { name: "Bean House", score: 62.2, standing: "behind", change: null },
        { name: "The Daily Grind", score: 38, standing: "about_same", change: null },
        { name: "Copper Kettle Cafe", score: 12, standing: "ahead", change: null },
      ]),
      [row("The Daily Grind"), row("Bean House"), row("Copper Kettle Cafe")],
    );
    expect(v.margin).toBe(7);
    expect(v.leaderboard.map((r) => [r.name, r.score, r.standing, r.shade])).toEqual([
      ["Bean House", 62, "behind", 1],
      ["Sunrise Coffee Bar", 41, null, null],
      ["The Daily Grind", 38, "about_same", 2],
      ["Copper Kettle Cafe", 12, "ahead", 3],
    ]);
  });

  it("lists a competitor added after the last scan without a score, at the end", () => {
    const v = view(
      report({ score: 50, margin: 5 }, [
        { name: "Bean House", score: 60, standing: "behind", change: null },
        { name: "Blue Door Coffee", score: 0, standing: "ahead", change: null },
      ]),
      [row("Blue Door Coffee", null, new Date(LAST_SCAN.getTime() + 60_000)), row("Bean House")],
    );
    expect(v.leaderboard.map((r) => [r.name, r.score, r.standing])).toEqual([
      ["Bean House", 60, "behind"],
      ["Sunrise Coffee Bar", 50, null],
      ["Blue Door Coffee", null, null],
    ]);
  });

  it("marks a competitor added after the window's first check as still collecting, with no standing (F-53)", () => {
    const v = view(
      report({ score: 50, margin: 5 }, [
        { name: "Bean House", score: 30, standing: "ahead", change: null },
        { name: "Blue Door Coffee", score: 10, standing: "ahead", change: null },
        { name: "Copper Kettle Cafe", score: 70, standing: "behind", change: null },
      ]),
      [row("Bean House"), row("Blue Door Coffee", null, new Date("2026-09-10T12:00:00Z")), row("Copper Kettle Cafe", null, FIRST_SCAN)],
    );
    expect(v.leaderboard.map((r) => [r.name, r.score, r.standing, r.collecting, r.shade])).toEqual([
      ["Copper Kettle Cafe", 70, "behind", false, 1],
      ["Sunrise Coffee Bar", 50, null, false, null],
      ["Bean House", 30, "ahead", false, 2],
      ["Blue Door Coffee", 10, null, true, null],
    ]);
  });

  it("shows a weekly change for a compared competitor, never for one still collecting (DB-013)", () => {
    const up = { direction: "up" as const, points: 8.6 };
    const v = view(
      report({ score: 50, margin: 5 }, [
        { name: "Bean House", score: 30, standing: "ahead", change: up },
        { name: "Blue Door Coffee", score: 10, standing: "ahead", change: up },
      ]),
      [row("Bean House"), row("Blue Door Coffee", null, new Date("2026-09-10T12:00:00Z"))],
    );
    expect(v.leaderboard.filter((r) => !r.isYou).map((r) => [r.name, r.change])).toEqual([
      ["Bean House", { direction: "up", points: 9 }],
      ["Blue Door Coffee", null],
    ]);
  });

  it("counts a competitor as complete once the window starts after it was added", () => {
    const added = new Date("2026-09-10T12:00:00Z");
    const r = { ...report({ score: 50, margin: 5 }, [{ name: "Blue Door Coffee", score: 10, standing: "ahead" as const, change: null }]) };
    const v = view({ ...r, firstCheckedAt: new Date(added.getTime() + 60_000) }, [row("Blue Door Coffee", null, added)]);
    expect(v.leaderboard.find((x) => !x.isYou)).toMatchObject({ collecting: false, standing: "ahead", change: null });
  });

  it("before any scan: no score, no standings", () => {
    const v = view(report(null), [row("Bean House")]);
    expect(v.hasScore).toBe(false);
    expect(v.margin).toBeNull();
    expect(v.leaderboard.every((r) => r.score === null && r.standing === null && !r.collecting)).toBe(true);
    expect(v.count).toBe(1);
  });
});

describe("signals", () => {
  it("pairs each business with its live values, and marks unmatched and failed ones", () => {
    const signals = new Map<string, SignalResult>([
      ["ChIJ-fixture-sunrise-coffee", FIXTURE_SIGNALS["ChIJ-fixture-sunrise-coffee"]],
      ["ChIJ-fixture-bean-house", FIXTURE_SIGNALS["ChIJ-fixture-bean-house"]],
      ["ChIJ-fixture-daily-grind", "error"],
    ]);
    const v = view(report(null), [row("Bean House", "ChIJ-fixture-bean-house"), row("The Daily Grind", "ChIJ-fixture-daily-grind"), row("Walk-in Cafe")], signals);
    expect(v.signals.map((s) => [s.name, s.isYou, s.status])).toEqual([
      ["Sunrise Coffee Bar", true, "linked"],
      ["Bean House", false, "linked"],
      ["The Daily Grind", false, "error"],
      ["Walk-in Cafe", false, "missing"],
    ]);
    expect(headToHead(v.signals[1], v.signals[0])).toBe("Bean House: 320 Google reviews, 4.7 stars. You: 12 reviews, 4.2 stars");
  });

  it("words reviews, hours and websites plainly", () => {
    expect(reviewsText({ rating: 5, reviewCount: 1 })).toBe("1 Google review, 5.0 stars");
    expect(reviewsText({ rating: null, reviewCount: null })).toBe("No Google reviews yet");
    expect(reviewsText({ rating: 4.1, reviewCount: 1200 }, false)).toBe("1,200 reviews, 4.1 stars");
    expect(hoursText(FIXTURE_SIGNALS["ChIJ-fixture-bean-house"].hours)).toBe("Open 7 days a week");
    expect(hoursText(FIXTURE_SIGNALS["ChIJ-fixture-morning-ritual"].hours)).toBe("Open 5 days a week");
    expect(hoursText(null)).toBeNull();
    expect(websiteLabel("https://www.beanhouse.com/menu")).toBe("beanhouse.com");
  });
});

describe("toSignals", () => {
  it("reads the Places details fields and drops generic types", () => {
    const s = toSignals({
      id: "ChIJabc123456",
      rating: 4.6,
      userRatingCount: 158,
      primaryTypeDisplayName: { text: "Coffee shop" },
      types: ["coffee_shop", "cafe", "point_of_interest", "establishment", "food"],
      websiteUri: "https://example.com",
      regularOpeningHours: { weekdayDescriptions: ["Monday: Closed"] },
      googleMapsUri: "https://maps.google.com/?cid=1",
    });
    expect(s).toEqual({
      rating: 4.6,
      reviewCount: 158,
      categories: ["Coffee shop", "Cafe"],
      website: "https://example.com",
      hours: ["Monday: Closed"],
      mapsUri: "https://maps.google.com/?cid=1",
    });
  });

  it("treats a place with nothing listed as empty values", () => {
    expect(toSignals({ id: "ChIJabc123456" })).toEqual({
      rating: null,
      reviewCount: null,
      categories: [],
      website: null,
      hours: null,
      mapsUri: null,
    });
  });
});

describe("matchedNone (DB-016)", () => {
  const sig = (status: "linked" | "missing" | "error") => ({ name: status, isYou: false, status, signals: null });
  it("is true only when Google had no listing for any business", () => {
    expect(matchedNone([sig("missing"), sig("missing")])).toBe(true);
    expect(matchedNone([sig("missing"), sig("error")])).toBe(false);
    expect(matchedNone([sig("missing"), sig("linked")])).toBe(false);
  });
});
