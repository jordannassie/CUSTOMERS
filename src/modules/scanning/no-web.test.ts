import { describe, expect, it } from "vitest";
import { isNoWebAnswer } from "./no-web";

// Migration 095 holds the same rule in SQL; these phrases must give the same result there.
const NO_WEB_PHRASES = [
  "I don't have access to current, real-time information about coffee shops in New York.",
  "I don’t have access to real-time data, but popular options include...",
  "I can't browse the internet, so I can't tell you which plumber is best right now.",
  "I'm unable to search the web for current reviews.",
  "I do not have real-time information about local businesses in Austin.",
  "As an AI, my knowledge has a cutoff, so I can't recommend a specific dentist.",
];

const WEB_PHRASES = [
  "Try Bean There Coffee or Rival Roasters, both well reviewed on Yelp.",
  "Here are three options: Joe's Plumbing, Ace Rooter and Northside Plumbing.",
  `${"Joe's Pizza is the local favourite. ".repeat(10)}I can't check live opening hours, so call ahead.`,
];

describe("isNoWebAnswer", () => {
  it.each(NO_WEB_PHRASES)("treats a no-web refusal with no sources as a failed check: %s", (text) => {
    expect(isNoWebAnswer(text, [])).toBe(true);
    expect(isNoWebAnswer(text, null)).toBe(true);
  });

  it.each(WEB_PHRASES)("keeps a real answer: %s", (text) => {
    expect(isNoWebAnswer(text, [])).toBe(false);
  });

  it("keeps a refusal-sounding opening when the answer cited sources (it did look things up)", () => {
    expect(isNoWebAnswer(NO_WEB_PHRASES[0], [{ url: "https://www.yelp.com/nyc-coffee" }])).toBe(false);
  });
});
