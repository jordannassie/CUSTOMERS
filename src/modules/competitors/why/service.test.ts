import { describe, expect, it } from "vitest";
import { claimRows, compareRows, fixesAbout, openFixRefs, serviceChips, standingSentence, whyCard, whySentence, withFixes } from "./service";

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
    fixRefs: [],
    website: { domain: null, status: null, checkedAt: null, checked: false, checking: false, services: [], claims: [], compare: null },
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
      sources: [],
      areas: [],
      theirPages: [],
      yourPages: [],
      reasons: [{ title: "Reason one", detail: "", text: "Reason one.", where: "website" as const, weight: 3 }],
      youLead: [{ title: "You lead", detail: "", text: "You lead.", where: null, weight: 2 }],
      allReasons: [],
      allLeads: [],
      ...over,
    },
  });
  const you = { name: "Joe's", isYou: true, score: 20, standing: null };

  it("picks the competitor furthest ahead, from the leaderboard's standing", () => {
    const rows = [{ name: "A", isYou: false, score: 60, standing: "behind" as const }, { name: "B", isYou: false, score: 40, standing: "behind" as const }, you];
    const card = whyCard(rows, [panel("b", "B"), panel("a", "A")]);
    expect(card).toMatchObject({ competitorId: "a", side: "behind", facts: [{ text: "Reason one." }] });
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
  const card = (side: "behind" | "ahead", text: string) => ({ competitorId: "a", name: "Bean House", side, question: null, facts: [{ title: text, detail: "", text, where: null, weight: 1 }] });

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

describe("openFixRefs", () => {
  const fix = (over: Partial<Parameters<typeof openFixRefs>[0][number]>) => ({
    id: "f",
    title: "",
    description: null,
    evidence: null,
    recommended_action: null,
    category: null,
    claude_prompt: null,
    ...over,
  });

  it("places each fix by the same rule as the Opportunities page", () => {
    const refs = openFixRefs([
      fix({ id: "g", title: "Ask for Google reviews", category: "reviews_reputation" }),
      fix({ id: "m", title: "Add a menu page", claude_prompt: "Draft it." }),
    ]);
    expect(refs.map((r) => [r.id, r.where])).toEqual([["g", "google_listing"], ["m", "website"]]);
    expect(openFixRefs([])).toEqual([]);
  });

  it("ties each reason to the fix about it, not the first fix in its group", () => {
    const refs = openFixRefs([
      fix({ id: "menu", title: "Add a menu page", claude_prompt: "Draft it." }),
      fix({ id: "faq", title: "Add an FAQ section", claude_prompt: "Draft it." }),
    ]);
    const reason = { title: "Their website answers common questions", detail: "", text: "x", where: "website" as const, weight: 2, match: ["faq"] };
    const other = { ...reason, text: "y", match: ["parking"] };
    const why = withFixes({ reasons: [reason, other], allReasons: [reason, other] } as never, refs);
    expect(why.reasons.map((r) => r.fixId ?? null)).toEqual(["faq", null]);
    expect(why.allReasons[0].fixId).toBe("faq");
  });
});

describe("serviceChips", () => {
  const theirs = { status: "read" as const, services: [{ name: "office catering", page: "/services" }, { name: "espresso drinks", page: "/" }], hasPhone: true, hasAddress: true };
  it("marks what only they list, and marks nothing when your site wasn't read", () => {
    expect(serviceChips(theirs, { read: true, services: ["Espresso"], hasPhone: true, hasAddress: true })).toEqual([
      { name: "office catering", onlyThem: true, page: "/services", quote: null, yours: false },
      { name: "espresso drinks", onlyThem: false, page: "/", quote: null, yours: { name: "Espresso", page: null, quote: null } },
    ]);
    expect(serviceChips(theirs, { read: false, services: [], hasPhone: null, hasAddress: null }).some((c) => c.onlyThem)).toBe(false);
  });

  it("gives your own words when a check read your site, or says your pages mention it outside your services", () => {
    const yours = { read: true, services: ["espresso drinks"], hasPhone: null, hasAddress: null, words: ["office", "catering"] };
    const chips = serviceChips(theirs, yours, [{ name: "espresso drinks", page: "/menu", quote: "Espresso drinks all day." }]);
    expect(chips[1].yours).toEqual({ name: "espresso drinks", page: "/menu", quote: "Espresso drinks all day." });
    expect(chips[0].yours).toBe("mentioned");
    expect(serviceChips(theirs, { read: false, services: [], hasPhone: null, hasAddress: null })[0].yours).toBeNull();
  });
});

describe("compareRows", () => {
  const signals = { businessSchema: true, contactForm: false, reviews: true, faq: true, hours: false, words: 900, aiBlocked: [] };
  const theirs = { status: "read" as const, services: [], hasPhone: true, hasAddress: true, signals };
  it("puts each check side by side, and leaves your column empty until your site was read the same way", () => {
    const rows = compareRows(theirs, { read: true, services: [], hasPhone: true, hasAddress: true, signals: { ...signals, aiBlocked: ["GPTBot"], faq: false, words: 120 } })!;
    expect(rows[0]).toEqual({ label: "Lets AI tools read it", them: true, you: false });
    expect(rows.find((r) => r.label === "FAQ section")).toEqual({ label: "FAQ section", them: true, you: false });
    expect(rows.at(-1)).toEqual({ label: "Words on the pages we read", them: 900, you: 120 });
    expect(compareRows(theirs, { read: true, services: [], hasPhone: null, hasAddress: null })!.every((r) => r.you === null)).toBe(true);
    expect(compareRows({ ...theirs, signals: null }, { read: false, services: [], hasPhone: null, hasAddress: null })).toBeNull();
  });
});

describe("claimRows", () => {
  const claim = (key: string, label: string, quote: string) => ({ key, label, page: "/", quote });
  const theirs = {
    status: "read" as const,
    services: [],
    hasPhone: null,
    hasAddress: null,
    claims: [claim("years", "years in business", "Roasting since 2009."), claim("free_estimates", "free estimates", "Free quotes for teams.")],
  };

  it("lists every claim either site makes, in a fixed order, with each side's words", () => {
    const yours = { read: true, services: [], hasPhone: null, hasAddress: null, claims: [claim("prices", "prices", "Lattes from $4.")] };
    expect(claimRows(theirs, yours)).toEqual([
      { key: "free_estimates", label: "free estimates", them: { page: "/", quote: "Free quotes for teams." }, you: false },
      { key: "prices", label: "prices", them: false, you: { page: "/", quote: "Lattes from $4." } },
      { key: "years", label: "years in business", them: { page: "/", quote: "Roasting since 2009." }, you: false },
    ]);
  });

  it("says we can't tell for you when your site wasn't read the same way", () => {
    expect(claimRows(theirs, { read: true, services: [], hasPhone: null, hasAddress: null }).every((r) => r.you === null)).toBe(true);
  });
});
