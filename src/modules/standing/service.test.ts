import { describe, expect, it } from "vitest";
import { toCheck, type StandingCheck } from "./checks";
import { assistantLine, competitorWhy, questionLine, type WhyInput } from "./service";

const Q1 = "q1";
const Q2 = "q2";
const questions = new Map([
  [Q1, "best tire shop in Dallas"],
  [Q2, "tire repair near me"],
]);

function check(over: Partial<StandingCheck> = {}): StandingCheck {
  return { provider: "openai", questionId: Q1, youNamed: false, competitors: [], extracted: null, sites: [], ...over };
}

function input(checks: StandingCheck[], over: Partial<WhyInput> = {}): WhyInput {
  return {
    checks,
    questions,
    you: { domain: "joestires.com", websiteBlocked: false },
    competitor: { name: "Bean Tires", domain: null },
    ...over,
  };
}

const theyWin = (n: number, over: Partial<StandingCheck> = {}) => Array.from({ length: n }, () => check({ competitors: ["Bean Tires"], ...over }));
const youWin = (n: number, over: Partial<StandingCheck> = {}) => Array.from({ length: n }, () => check({ youNamed: true, questionId: Q2, ...over }));

describe("toCheck", () => {
  it("reads saved rows, skipping names marked not named and repeated sites", () => {
    const c = toCheck({
      provider: "openai",
      tracked_prompt_id: Q1,
      business_mentioned: true,
      competitors_mentioned: [{ name: "Bean Tires", position: 1 }, { name: "Old Row", mentioned: false }],
      extracted_names: null,
      cited_sources: [{ url: "https://www.yelp.com/biz/a" }, { url: "https://yelp.com/biz/b" }, { url: "not a url" }],
    });
    expect(c).toMatchObject({ questionId: Q1, youNamed: true, competitors: ["Bean Tires"], sites: ["yelp.com"] });
  });

  it("treats broken JSON as nothing named", () => {
    const c = toCheck({ provider: "openai", tracked_prompt_id: null, business_mentioned: null, competitors_mentioned: "x", extracted_names: null, cited_sources: null });
    expect(c).toMatchObject({ questionId: "none", youNamed: false, competitors: [], sites: [] });
  });
});

describe("competitorWhy", () => {
  it("lists the questions and AI tools where they beat you, biggest gap first", () => {
    const why = competitorWhy(input([...theyWin(5), check(), ...youWin(2, { competitors: ["Bean Tires"] }), ...youWin(2)]));
    expect(why.questionsTheyWin.map((q) => q.questionId)).toEqual([Q1]);
    expect(why.questionsYouWin.map((q) => q.questionId)).toEqual([Q2]);
    expect(questionLine(why.questionsTheyWin[0], why.name)).toBe('On "best tire shop in Dallas", AI named Bean Tires in 5 of 6 answers and you in 0.');
    expect(assistantLine(why.assistantsTheyWin[0], why.name)).toBe("ChatGPT named Bean Tires in 7 of 10 answers, and you in 4.");
  });

  it("never lists a question as won by them when you were named as often", () => {
    const why = competitorWhy(input([check({ competitors: ["Bean Tires"], youNamed: true }), check({ competitors: ["Bean Tires"], youNamed: true })]));
    expect(why.questionsTheyWin).toEqual([]);
    expect(why.questionsYouWin).toEqual([]);
  });

  it("needs at least 2 answers and them named strictly more before a question counts as theirs (D-89)", () => {
    // 1 of 1 against 0 of 1 is not a win, so it gives no website reason and no "likely reason" line.
    expect(competitorWhy(input(theyWin(1))).questionsTheyWin).toEqual([]);
    // 2 of 2 against 0 of 2 counts, even though it is inside the margin (a first scan still gives website reasons).
    expect(competitorWhy(input(theyWin(2))).questionsTheyWin.map((q) => q.questionId)).toEqual([Q1]);
    expect(competitorWhy(input([...theyWin(1), check({ youNamed: true })])).questionsTheyWin).toEqual([]);
  });

  it("gives no website reason for a question answered once", () => {
    const theirWebsite = { status: "read" as const, services: [{ name: "Tire rotation", page: "/services" }], hasPhone: false, hasAddress: false };
    const site = { read: true, services: ["oil change"], hasPhone: false, hasAddress: false };
    const once = competitorWhy(input(theyWin(1), { theirWebsite, you: { domain: "joestires.com", websiteBlocked: false, site } }));
    const twice = competitorWhy(input(theyWin(2), { theirWebsite, you: { domain: "joestires.com", websiteBlocked: false, site } }));
    const rotation = (w: typeof once) => w.allReasons.find((f) => f.key === "web:service:tire rotation");
    // "best tire shop in Dallas" shares "tire" with the service: only a won question lifts it.
    expect(rotation(once)?.detail).toBe("Not in the services on yours. Found on their /services page.");
    expect(rotation(twice)?.detail).toBe('Not in the services on yours. AI named them more often on "best tire shop in Dallas".');
  });

  it("names a review site AI used when it named them and not you, with where to fix it", () => {
    const why = competitorWhy(input(theyWin(3, { sites: ["yelp.com", "bean-tires.com"] })));
    expect(why.reasons).toContainEqual(expect.objectContaining({ where: "other_places", text: "AI used yelp.com in 3 answers that named Bean Tires and not you. Check your listing there." }));
  });

  it("says AI used their own website more than yours, finding it by name when the user typed none", () => {
    const why = competitorWhy(input(theyWin(3, { sites: ["beantires.com"] })));
    expect(why.site).toBe("beantires.com");
    expect(why.reasons[0]).toMatchObject({ where: "website" });
    expect(why.reasons[0].text).toContain("AI used Bean Tires' website (beantires.com) in 3 answers. It used yours in 0 answers.");
  });

  it("never asks you to check a listing on another business's website", () => {
    const why = competitorWhy(input(theyWin(3, { sites: ["someblog.com"] })));
    expect(why.reasons).toEqual([]);
  });

  it("puts a blocked website first among the reasons", () => {
    const why = competitorWhy(input(theyWin(2, { sites: ["yelp.com"] }), { you: { domain: "joestires.com", websiteBlocked: true } }));
    expect(why.reasons[0].text).toBe("Your website turned our reader away, so AI tools may not be able to read it either.");
  });

  it("reads Google values from your side, so a lead is never shown as a gap", () => {
    const theirs = { rating: 4.2, reviewCount: 12, hours: null, categories: ["Tire shop"] };
    const yours = { rating: 4.8, reviewCount: 320, hours: null, categories: ["Tire shop"] };
    const why = competitorWhy(input(theyWin(1), { google: { theirs, yours } }));
    expect(why.reasons).toEqual([]);
    expect(why.youLead.map((f) => f.text)).toContain("Bean Tires has 12 Google reviews, you have 320.");
  });

  it("gives Google gaps when they are ahead, and none without Google values", () => {
    const theirs = { rating: 4.7, reviewCount: 320, hours: ["Monday: 8 AM to 6 PM", "Sunday: Closed"], categories: ["Tire shop"] };
    const yours = { rating: 4.7, reviewCount: 300, hours: ["Monday: 8 AM to 6 PM", "Sunday: Closed"], categories: ["Auto repair shop"] };
    const why = competitorWhy(input(theyWin(1), { google: { theirs, yours } }));
    expect(why.reasons.map((f) => f.text)).toEqual(['Google lists Bean Tires as "Tire shop" and you as "Auto repair shop". AI may match the question to their category.']);
    expect(competitorWhy(input(theyWin(1))).reasons).toEqual([]);
  });

  it("says where you lead", () => {
    const why = competitorWhy(input([...youWin(3, { sites: ["joestires.com"] }), ...theyWin(1)]));
    expect(why.youLead.map((f) => f.text)).toEqual([
      "AI named you more often than Bean Tires on 1 of 2 questions.",
      "AI used your website in 3 answers, and Bean Tires' in 0.",
    ]);
  });

  it("counts a chain's branch under its tracked name but says the chain AI named", () => {
    const why = competitorWhy(
      input(theyWin(3, { competitors: ["Bennu Coffee on Congress"], sites: ["yelp.com", "bennucoffee.com"] }), {
        competitor: { name: "Bennu Coffee on Congress", domain: null, label: "Bennu Coffee" },
      }),
    );
    expect(why).toMatchObject({ name: "Bennu Coffee", them: 3, site: "bennucoffee.com" });
    expect(why.reasons.map((f) => f.text)).toContain("AI used yelp.com in 3 answers that named Bennu Coffee and not you. Check your listing there.");
  });

  it("works with no answers", () => {
    const why = competitorWhy(input([]));
    expect(why).toMatchObject({ answers: 0, them: 0, you: 0, questionsTheyWin: [], reasons: [], youLead: [] });
  });
});
