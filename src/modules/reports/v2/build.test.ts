import { describe, expect, it } from "vitest";
import { buildReportSnapshot, pooledScore } from "./build";
import { BANNED, LONG_DASHES, NOW, check, keys, row, sampleInput, strings } from "./report.test-helpers";
import { reportSnapshotSchema } from "./snapshot-schema";

describe("buildReportSnapshot", () => {
  const snap = buildReportSnapshot(sampleInput());

  it("gives one score that matches X of N answers", () => {
    expect(snap.named).toEqual({ answers: 6, total: 30, questions: 3, questionsAsked: 5 });
    expect(snap.score.value).toBe(Math.round((100 * snap.named.answers) / snap.named.total));
    expect(snap.coverage).toEqual({ questions: 5, engines: ["ChatGPT", "Claude", "Perplexity"], answers: 30 });
    expect(snap.summary.headline).toBe("AI named Cheezious in 6 of 30 answers. Pizza Hut was named in 14.");
    expect(snap.summary.lead).toContain("came up in 20% of answers");
  });

  it("uses the counted answers when the app's score ever differs", () => {
    const s = buildReportSnapshot(sampleInput({ score: { value: 23, margin: 6, change: null } }));
    expect(s.score.value).toBe(20);
    expect(pooledScore([check("q", true), check("q", false), check("q", false)])).toBe(33);
  });

  it("places you among tracked businesses by the leaderboard rule, with the leader's score", () => {
    expect(snap.rank).toEqual({ position: 2, of: 4, leader: { name: "Pizza Hut", score: 47 } });
  });

  it("has no rank with no competitor tracked, and no share of picks", () => {
    const s = buildReportSnapshot(sampleInput({ leaderboard: [row("Cheezious", 20, { isYou: true })] }));
    expect(s.rank).toBeNull();
    expect(s.shareOfPicks).toBeNull();
    expect(s.businesses).toEqual([{ name: "Cheezious", isYou: true, mentions: 6, score: 20 }]);
  });

  it("counts share of picks over answers naming any tracked business", () => {
    // 6 / (6 + 14 + 5 + 0)
    expect(snap.shareOfPicks).toBe(24);
  });

  it("shows a competitor AI never named as 0 mentions, with no preference wording", () => {
    const dampukh = snap.businesses.find((b) => b.name === "Dampukh");
    expect(dampukh).toEqual({ name: "Dampukh", isYou: false, mentions: 0, score: 0 });
    expect(snap.behind.line).toContain("Dampukh was not named in any answer.");
    expect(strings(snap).filter((t) => /Dampukh/.test(t) && /prefer/i.test(t))).toEqual([]);
  });

  it("lists businesses by answers naming them, and the counts match the line", () => {
    expect(snap.businesses.map((b) => [b.name, b.mentions])).toEqual([
      ["Pizza Hut", 14],
      ["Cheezious", 6],
      ["Domino's", 5],
      ["Dampukh", 0],
    ]);
    expect(snap.behind.line).toBe(
      "Pizza Hut was named in 14 of 30 answers, Cheezious in 6 and Domino's in 5. Dampukh was not named in any answer. 4 reasons explain most of the gap.",
    );
  });

  it("counts a chain row once with every tracked branch", () => {
    const checks = [check("q-price", false, ["Bennu Coffee on Congress"]), check("q-price", false, ["Bennu Coffee"]), check("q-price", true)];
    const leaderboard = [row("Bennu Coffee on Congress", 67, { chain: { brand: "Bennu Coffee", tracked: ["Bennu Coffee on Congress", "Bennu Coffee"] } }), row("Cheezious", 33, { isYou: true })];
    const s = buildReportSnapshot(sampleInput({ checks, leaderboard, score: { value: 33, margin: null, change: null } }));
    expect(s.businesses[0]).toEqual({ name: "Bennu Coffee", isYou: false, mentions: 2, score: 67 });
  });

  it("knows what AI names you for, who trusts you and where it found you", () => {
    expect(snap.knows.knownFor).toEqual({ title: "Fair prices and good value", detail: "Named in 4 of 6 price answers." });
    expect(snap.knows.trustedBy).toEqual({ title: "thecookbook.pk", detail: "thecookbook.pk named you in 3 of 3 answers." });
    expect(snap.knows.foundThrough?.title).toBe("thecookbook.pk and Foodpanda");
    expect(snap.knows.headline).toBe("AI sees Cheezious as a value option, and knows little else");
    expect(snap.knows.gaps.map((g) => g.fix)).toEqual([1, 2, 3, 4]);
    expect(snap.knows.gaps[1]).toEqual({ title: "Your Google listing and ratings", evidence: "Google fed 8 answers, none named you.", fix: 2 });
  });

  it("explains the gap with numbers and the fixes that close it", () => {
    expect(snap.behind.headline).toBe("Pizza Hut gives AI more to work with");
    expect(snap.behind.reasons).toHaveLength(4);
    expect(snap.behind.reasons[1]).toEqual({
      title: "Google sends answers their way",
      them: "Google fed 8 answers that named Pizza Hut.",
      you: "Google fed 8 answers and named you in none.",
      fixes: [2],
    });
    expect(snap.behind.reasons[3].fixes).toEqual([4, 5]);
    for (const r of snap.behind.reasons) expect(`${r.them} ${r.you}`).toMatch(/\d/);
    expect(snap.behind.wins).toContain("thecookbook.pk named you in 3 of the 3 answers that used it.");
  });

  it("maps fixes to the places the changes are made", () => {
    expect(snap.areas.map((a) => [a.area, a.label, a.fixes])).toEqual([
      ["website", "Your website", [1, 4, 5]],
      ["google", "Google Business Profile", [2, 5]],
      ["delivery", "Foodpanda", [3, 5]],
      ["reviews", "TripAdvisor", [4, 6]],
      ["blogs", "Blogs and guides", [4]],
    ]);
  });

  it("covers the 30 days to the report date, and the next scan", () => {
    expect(snap.period).toEqual({ start: "2026-09-29", end: "2026-10-28", days: 30 });
    expect(snap.preparedAt).toBe(NOW.toISOString());
    expect(snap.roadmap.nextScanAt).toBe("2026-11-27T09:00:00.000Z");
    expect(snap.method.text).toContain("That gave 30 answers between Sep 29, 2026 and Oct 28, 2026.");
  });

  it("builds the same snapshot every time and it parses", () => {
    expect(buildReportSnapshot(sampleInput())).toEqual(snap);
    expect(reportSnapshotSchema.safeParse(snap).success).toBe(true);
  });

  it("holds no Google Places values", () => {
    const placesKeys = ["rating", "reviewCount", "userRatingCount", "hours", "openingHours", "placeId", "placesId", "place_id", "address", "phone", "categories"];
    expect(keys(snap).filter((k) => placesKeys.includes(k))).toEqual([]);
    expect(strings(snap).filter((t) => /\d\.\d\s*(stars?|★)|\(\d+ reviews\)/i.test(t))).toEqual([]);
  });

  it("follows the wording rules", () => {
    const text = strings(snap);
    expect(text.filter((t) => LONG_DASHES.test(t))).toEqual([]);
    expect(text.filter((t) => BANNED.test(t))).toEqual([]);
    expect(text.filter((t) => /\bin AI\b.*#\d|rank in AI/i.test(t))).toEqual([]);
  });

  it("cleans a long dash typed in a name", () => {
    const dash = String.fromCharCode(0x2014);
    const s = buildReportSnapshot(sampleInput({ business: { name: `Cheezious ${dash} Saddar`, domain: "cheezious.com", market: null } }));
    expect(strings(s).filter((t) => LONG_DASHES.test(t))).toEqual([]);
  });

  it("says when you lead every tracked business", () => {
    const checks = [check("q-price", true), check("q-price", true), check("q-quality", false, ["Pizza Hut"])];
    const s = buildReportSnapshot(sampleInput({ checks, score: { value: 67, margin: null, change: null }, leaderboard: [row("Cheezious", 67, { isYou: true }), row("Pizza Hut", 33)] }));
    expect(s.behind.headline).toBe("No business you track is named more often than you");
    expect(s.behind.reasons).toEqual([]);
    expect(s.summary.headline).toBe("AI named Cheezious in 2 of 3 answers. That is more than any business you track.");
    expect(s.roadmap.columns[2].goal).toBe("keep your lead over the businesses you track");
  });
});
