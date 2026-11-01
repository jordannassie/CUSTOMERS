import { describe, expect, it } from "vitest";
import { detectMention, detectMentions } from "./mentions";

describe("detectMention: spacing and punctuation inside the name (B6)", () => {
  const bookWoman = { name: "BookWoman", city: "Austin", hasWebsite: true };

  it("finds the name however the answer spaces it", () => {
    for (const written of ["BookWoman", "Book Woman", "Book-Woman", "BOOK  WOMAN", "Book.Woman"]) {
      expect(detectMention(`1. ${written} is a feminist bookstore on North Lamar.`, bookWoman), written).toMatchObject({ mentioned: true, position: 1 });
    }
  });

  it("finds a spaced name written without the space", () => {
    expect(detectMention("Try BookWoman for readings.", { name: "Book Woman", city: "Austin", hasWebsite: true }).mentioned).toBe(true);
  });

  it("keeps the word-boundary and generic-name rules", () => {
    // Not inside longer words, and not for a lowercase common phrase.
    expect(detectMention("The notebookwomanly shelf and a book womanizer.", bookWoman).mentioned).toBe(false);
    expect(detectMention("she is a book woman at heart", bookWoman).mentioned).toBe(false);
    // Short names still need the exact spelling: "Ace" must not appear as "A ce".
    expect(detectMention("Ask A Ce Plumbing in Austin.", { name: "Ace", city: "Austin", hasWebsite: true }).mentioned).toBe(false);
    // A generic name still needs the city or domain nearby.
    const firstChoice = { name: "First Choice", city: "Austin", hasWebsite: true };
    expect(detectMention("FirstChoice is listed.", firstChoice).mentioned).toBe(false);
    expect(detectMention("FirstChoice in Austin is listed.", firstChoice).mentioned).toBe(true);
  });

  it("counts a competitor spelled differently the same way", () => {
    const result = detectMentions("1. Book-People\n2. Book Woman", bookWoman, [{ name: "BookPeople", city: "Austin", hasWebsite: true }]);
    expect(result.competitors[0]).toMatchObject({ mentioned: true, position: 1 });
    expect(result.business).toMatchObject({ mentioned: true, position: 2 });
  });
});
