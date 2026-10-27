import { describe, expect, it } from "vitest";
import { questionFacts, signalFacts, type SignalSet } from "./site-signals";

const base: SignalSet = { businessSchema: false, contactForm: false, reviews: false, faq: false, hours: false, words: 200, aiBlocked: [] };

describe("signalFacts (step 1)", () => {
  it("puts your site blocking AI tools first, then what only they show, and what only you show as your lead", () => {
    const { behind, ahead } = signalFacts({ ...base, businessSchema: true, faq: true, words: 900 }, { ...base, contactForm: true, aiBlocked: ["GPTBot", "ClaudeBot"], words: 120 });
    expect(behind.map((f) => f.title)).toEqual([
      "Your website blocks some AI tools",
      "Their website has business details for AI",
      "Their website answers common questions",
      "Their website says more",
    ]);
    expect(behind[0].detail).toBe("Its robots.txt turns away GPTBot and ClaudeBot. Theirs lets them in.");
    expect(behind[1].detail).toContain("We didn't find it on the pages we read of yours.");
    expect(ahead.map((f) => f.title)).toEqual(["Your website has a contact or booking form"]);
  });

  it("says nothing about AI access when either robots.txt couldn't be read, or both block", () => {
    expect(signalFacts({ ...base, aiBlocked: null }, { ...base, aiBlocked: ["GPTBot"] }).behind).toEqual([]);
    expect(signalFacts({ ...base, aiBlocked: ["GPTBot"] }, { ...base, aiBlocked: ["GPTBot"] }).behind).toEqual([]);
  });
});

describe("questionFacts (step 2)", () => {
  const claim = (key: string, label: string, quote: string) => ({ key, label, page: "/", quote });

  it("matches what a won question asks to a claim only their site makes, with its quote", () => {
    const facts = questionFacts(
      [{ question: "Which plumber in Dallas offers emergency repairs?" }],
      { claims: [claim("emergency", "emergency service", "24/7 emergency plumbing")], words: ["plumber", "emergency"] },
      { claims: [], words: ["plumber"] },
    );
    expect(facts).toEqual([
      expect.objectContaining({
        title: "Their website says emergency service",
        detail: `They win "Which plumber in Dallas offers emergency repairs?". Yours doesn't say it. Theirs: "24/7 emergency plumbing"`,
        where: "website",
      }),
    ]);
  });

  it("falls back to the question's own words their site uses and yours doesn't, such as a place", () => {
    const facts = questionFacts([{ question: "Best tire shop in Plano?" }], { claims: [], words: ["tire", "plano"] }, { claims: [], words: ["tire"] });
    expect(facts[0]).toMatchObject({ title: 'Their website mentions "plano"', detail: `They win "Best tire shop in Plano?". Your website doesn't mention it.` });
  });

  it("says nothing when your site says the same, and gives at most 2", () => {
    const both = { claims: [claim("emergency", "emergency service", "x")], words: ["emergency"] };
    expect(questionFacts([{ question: "Emergency plumber?" }], both, both)).toEqual([]);
    const many = Array.from({ length: 4 }, (_, i) => ({ question: `Plumber in town${i}?` }));
    expect(questionFacts(many, { claims: [], words: ["town0", "town1", "town2", "town3"] }, { claims: [], words: [] })).toHaveLength(2);
  });
});
