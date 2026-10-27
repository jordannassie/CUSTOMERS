import { describe, expect, it } from "vitest";
import { ANSWER_MAX_CHARS, latestAnswers, plainAnswer } from "./answers";

// BUG-089: the answer behind each result on the Questions page.
const row = (provider: string, at: string, mentioned: boolean, text: string | null, competitors: unknown = []) => ({
  provider,
  created_at: at,
  business_mentioned: mentioned,
  competitors_mentioned: competitors,
  answer_text: text,
});

describe("latestAnswers", () => {
  it("keeps the newest answer per chosen model, in the business's model order", () => {
    const rows = [
      row("perplexity", "2026-10-09T10:00:00Z", true, "1. **Mr. Rooter** - fast.", [{ name: "Pure Plumbing & Air", position: 2 }]),
      row("openai", "2026-10-09T09:00:00Z", false, "Try a few local plumbers."),
      row("openai", "2026-10-02T09:00:00Z", true, "Older answer."),
      row("anthropic", "2026-10-09T09:00:00Z", true, "Not a chosen model."),
    ];
    const answers = latestAnswers(rows, ["openai", "perplexity"]);
    expect(answers.map((a) => [a.label, a.namedYou, a.text])).toEqual([
      ["ChatGPT", false, "Try a few local plumbers."],
      ["Perplexity", true, "1. Mr. Rooter - fast."],
    ]);
    expect(answers[1].competitors).toEqual(["Pure Plumbing & Air"]);
  });

  it("lists the other businesses it named and the websites it used, each once", () => {
    const [a] = latestAnswers(
      [
        {
          ...row("openai", "2026-10-09T09:00:00Z", false, "Answer.", [{ name: "Bean Tires", position: 1 }]),
          extracted_names: { names: [{ name: "Bean Tires", matches: "competitor" }, { name: "Discount Tire", matches: null }, { name: "Joe's", matches: "business" }] },
          cited_sources: [{ url: "https://www.yelp.com/biz/a", title: null }, { url: "https://yelp.com/b" }, { url: "javascript:alert(1)" }, { url: "https://bbb.org/x" }],
        },
      ],
      ["openai"],
    );
    expect(a.others).toEqual(["Discount Tire"]);
    expect(a.sites).toEqual([
      { host: "yelp.com", url: "https://www.yelp.com/biz/a" },
      { host: "bbb.org", url: "https://bbb.org/x" },
    ]);
  });

  it("marks an answer served from the answer cache as reused (2026-10-16)", () => {
    const answers = latestAnswers(
      [{ ...row("openai", "2026-10-09T09:00:00Z", false, "Cached."), cached: true }, row("perplexity", "2026-10-09T09:00:00Z", true, "Asked again.")],
      ["openai", "perplexity"],
    );
    expect(answers.map((a) => [a.label, a.reused])).toEqual([
      ["ChatGPT", true],
      ["Perplexity", false],
    ]);
  });

  it("skips a check with no answer text, and gives nothing when a model has none", () => {
    expect(latestAnswers([row("openai", "2026-10-09T09:00:00Z", false, null)], ["openai"])).toEqual([]);
    expect(latestAnswers([], ["openai", "anthropic"])).toEqual([]);
  });
});

describe("plainAnswer", () => {
  it("drops markdown marks and keeps links readable", () => {
    expect(plainAnswer("## Top picks\n\n\n\n**Bean House** see [their site](https://bean.example)")).toBe(
      "Top picks\n\nBean House see their site (https://bean.example)",
    );
  });

  it("drops single-mark italics but leaves snake_case and lone stars", () => {
    expect(plainAnswer("Closed. _603 N Lamar Blvd, Austin_\n*Open late* on Fridays")).toBe("Closed. 603 N Lamar Blvd, Austin\nOpen late on Fridays");
    expect(plainAnswer("utm_source=openai and 5 * 3")).toBe("utm_source=openai and 5 * 3");
  });

  it("cuts a very long answer", () => {
    const long = plainAnswer("a".repeat(ANSWER_MAX_CHARS + 50));
    expect(long).toHaveLength(ANSWER_MAX_CHARS + 1);
    expect(long.endsWith("…")).toBe(true);
  });
});
