import { describe, expect, it } from "vitest";
import { fixesAbout, openWhere, standingSentence, whyCard, whySentence } from "./service";

const why = { name: "Bean Tires", answers: 40, them: 12, you: 5 };
const id = "11111111-2222-3333-4444-555555555555";
const row = (over: Partial<Parameters<typeof fixesAbout>[0][number]>) => ({ id: "f", title: "", description: null, evidence: null, recommended_action: null, ...over });

describe("standingSentence", () => {
  it("leads with whoever is ahead, from the owner's side", () => {
    expect(standingSentence(why, "behind")).toBe("AI named Bean Tires in 12 of 40 answers over the last 30 days, and you in 5.");
    expect(standingSentence({ ...why, them: 5, you: 12 }, "ahead")).toBe("AI named you in 12 of 40 answers over the last 30 days, and Bean Tires in 5.");
    expect(standingSentence(why, "about_same")).toMatch(/too small to call\.$/);
    expect(standingSentence({ ...why, answers: 0 }, null)).toBe("There are no answers from the last 30 days to compare yet.");
  });
});

describe("fixesAbout", () => {
  it("finds fixes that name the competitor or hold its Google placeholder", () => {
    const rows = [
      row({ id: "a", title: "AI assistants pick Bean Tires more often than you" }),
      row({ id: "b", title: "Get more reviews", evidence: `They have {competitor.${id}.review_count} reviews` }),
      row({ id: "c", title: "Add a services page" }),
      row({ id: "d", title: "Beat Bean Tiresome Co" }),
    ];
    expect(fixesAbout(rows, { id, name: "Bean Tires" }).map((f) => f.id)).toEqual(["a", "b"]);
    // A chain's branch: a fix naming the chain is about it too.
    expect(fixesAbout([row({ id: "e", title: "Bennu Coffee has more reviews" })], { id, name: "Bennu Coffee on Congress", also: "Bennu Coffee" })).toHaveLength(1);
  });
});

describe("whyCard", () => {
  const panel = (competitorId: string, name: string, over = {}) => ({
    competitorId,
    trackedName: name,
    fixes: [],
    openFixes: ["website" as const],
    why: {
      name,
      site: null,
      answers: 6,
      them: 5,
      you: 0,
      questionsTheyWin: [{ questionId: "q1", question: "best tire shop in Dallas", answers: 6, them: 5, you: 0 }],
      questionsYouWin: [],
      assistantsTheyWin: [],
      assistants: [],
      reasons: [{ title: "Reason one", detail: "", text: "Reason one.", where: "website" as const, weight: 3 }],
      youLead: [{ title: "You lead", detail: "", text: "You lead.", where: null, weight: 2 }],
      ...over,
    },
  });
  const you = { name: "Joe's", isYou: true, score: 20, standing: null };

  it("picks the competitor furthest ahead, from the leaderboard's standing", () => {
    const rows = [{ name: "A", isYou: false, score: 60, standing: "behind" as const }, { name: "B", isYou: false, score: 40, standing: "behind" as const }, you];
    const card = whyCard(rows, [panel("b", "B"), panel("a", "A")]);
    expect(card).toMatchObject({ competitorId: "a", side: "behind", facts: [{ text: "Reason one." }], openFixes: ["website"] });
    expect(card!.question).toBe('On "best tire shop in Dallas", AI named A in 5 of 6 answers and you in 0.');
  });

  it("explains your lead when you are ahead of every competitor compared", () => {
    const rows = [you, { name: "A", isYou: false, score: 5, standing: "ahead" as const }];
    expect(whyCard(rows, [panel("a", "A")])).toMatchObject({ side: "ahead", question: null, facts: [{ text: "You lead." }] });
  });

  it("shows nothing when a competitor is about the same or not compared yet", () => {
    expect(whyCard([you, { name: "A", isYou: false, score: 22, standing: "about_same" }], [panel("a", "A")])).toBeNull();
    expect(whyCard([you, { name: "A", isYou: false, score: null, standing: null }], [panel("a", "A")])).toBeNull();
  });
});

describe("whySentence", () => {
  const card = (side: "behind" | "ahead", text: string) => ({ competitorId: "a", name: "Bean House", side, question: null, facts: [{ title: text, detail: "", text, where: null, weight: 1 }], openFixes: [] });

  it("gives the first likely reason in one sentence, keeping names capitalised", () => {
    expect(whySentence(card("behind", "AI used yelp.com in 9 answers that named Bean House and not you. Check your listing there."))).toBe(
      "A likely reason Bean House is ahead of you: AI used yelp.com in 9 answers that named Bean House and not you.",
    );
    expect(whySentence(card("behind", 'Google lists Bean House as "Bakery" and you as "Cafe". AI may match it.'))).toBe(
      'A likely reason Bean House is ahead of you: Google lists Bean House as "Bakery" and you as "Cafe".',
    );
    expect(whySentence(card("ahead", "Your website turned our reader away, so AI tools may not be able to read it either."))).toBe(
      "A likely reason you are ahead of Bean House: your website turned our reader away, so AI tools may not be able to read it either.",
    );
  });

  it("says nothing without a fact", () => {
    expect(whySentence(null)).toBeNull();
    expect(whySentence({ ...card("behind", "x"), facts: [] })).toBeNull();
  });
});

describe("openWhere", () => {
  const fix = (over: Partial<Parameters<typeof openWhere>[0][number]>) => ({
    title: "",
    description: null,
    evidence: null,
    recommended_action: null,
    category: null,
    claude_prompt: null,
    ...over,
  });

  it("lists each Opportunities group that has a fix to do, by the same rule as the page", () => {
    expect(
      openWhere([
        fix({ title: "Ask for Google reviews", category: "reviews_reputation" }),
        fix({ title: "Add a menu page", claude_prompt: "Draft it." }),
        fix({ title: "More Google reviews", category: "reviews_reputation" }),
      ]).sort(),
    ).toEqual(["google_listing", "website"]);
    expect(openWhere([])).toEqual([]);
  });
});
