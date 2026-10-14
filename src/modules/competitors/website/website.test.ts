import { describe, expect, it } from "vitest";
import { detectMentions, type ScoreReport } from "@/modules/scanning";
import { FIXTURE_SIGNALS } from "../place-fixtures";
import { competitorsView, websiteDomain, websiteShown, type CompetitorRow, type SignalResult } from "../service";

// Side by side on Google: Google's website is shown live and never saved; a website the user typed is theirs.
const BEFORE = new Date("2026-08-10T12:00:00Z");
const report = { overall: null, byModel: [], models: [], trend: [], history: [], monthChange: null, modelChanges: {}, change: null, firstCheckedAt: null, lastCheckedAt: null, competitors: [], questions: [], ownQuestions: null, ownChain: null } as unknown as ScoreReport;
const row = (name: string, placesId: string | null): CompetitorRow => ({ name, placesId, countedFrom: BEFORE });
const view = (_r: ScoreReport, competitors: CompetitorRow[], signals: Map<string, SignalResult>) =>
  competitorsView({ business: { name: "Sunrise Coffee Bar", placesId: null }, report, competitors, signals, also: { names: [], answers: 0 }, limit: 5 });

describe("competitor websites (D-73: only what the user typed is saved)", () => {
  const signals = new Map<string, SignalResult>([
    ["ChIJ-fixture-bean-house", FIXTURE_SIGNALS["ChIJ-fixture-bean-house"]],
    ["ChIJ-no-site", { ...FIXTURE_SIGNALS["ChIJ-fixture-bean-house"], website: null }],
    ["ChIJ-failed", "error"],
  ]);
  const competitors: CompetitorRow[] = [
    { ...row("Bean House", "ChIJ-fixture-bean-house"), id: "c-1", domain: null },
    { ...row("Burning Brownie", "ChIJ-no-site"), id: "c-2", domain: null },
    { ...row("Typed Cafe", "ChIJ-no-site"), id: "c-3", domain: "typedcafe.com" },
    { ...row("Daily Grind", "ChIJ-failed"), id: "c-4", domain: "dailygrind.com" },
    { ...row("Cloudy Cafe", "ChIJ-failed"), id: "c-5", domain: null },
  ];
  const shown = () => view(report, competitors, signals).signals.slice(1).map((r) => [r.name, r.competitorId, websiteShown(r)]);

  it("shows Google's website, else the one you added, else 'No website on Google' when Google answered without one", () => {
    expect(shown()).toEqual([
      ["Bean House", "c-1", { kind: "google", url: FIXTURE_SIGNALS["ChIJ-fixture-bean-house"].website }],
      ["Burning Brownie", "c-2", { kind: "none_on_google" }],
      ["Typed Cafe", "c-3", { kind: "saved", domain: "typedcafe.com" }],
      // When the live lookup fails the saved website still shows, and nothing says "no website".
      ["Daily Grind", "c-4", { kind: "saved", domain: "dailygrind.com" }],
      ["Cloudy Cafe", "c-5", { kind: "unknown" }],
    ]);
  });

  it("keeps a typed website as a bare domain, and refuses what is not one", () => {
    expect(websiteDomain("https://www.Burning-Brownie.com/menu?x=1")).toBe("burning-brownie.com");
    expect(websiteDomain("burningbrownie.pk")).toBe("burningbrownie.pk");
    for (const bad of ["", "burning brownie", "localhost", "javascript:alert(1)", "http://127.0.0.1", "ftp://x.com"]) expect(websiteDomain(bad), bad).toBeNull();
  });

  it("counts an answer that names only the website you added for the competitor", () => {
    const answer = "Try burningbrownie.com for the best brownies in Islamabad.";
    const found = detectMentions(answer, { name: "Sunrise Coffee Bar", website: "sunrise.example" }, [{ name: "Burning Brownie Bakery", website: "burningbrownie.com" }]);
    expect(found.competitors[0]).toMatchObject({ name: "Burning Brownie Bakery", mentioned: true });
  });
});
