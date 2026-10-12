import { describe, expect, it } from "vitest";
import { mentionTargets, recountCheck, type SavedCheck } from "./service";

// BUG-122 and BUG-113: saved answers checked again with today's rules and competitor list.
const targets = mentionTargets(
  { name: "BookPeople", aliases: null, domain: "bookpeople.com", city: "Austin", phone: null, hasWebsite: true },
  [{ name: "First Light Book Shop", domain: null, phone: null, city: null }],
);
const saved = (answer: string, extra: Partial<SavedCheck> = {}): SavedCheck => ({
  id: "r1",
  answer_text: answer,
  extracted_names: null,
  business_mentioned: false,
  mention_position: null,
  competitors_mentioned: [],
  ...extra,
});

describe("recountCheck", () => {
  it("finds a competitor added after the answer was saved, under the name AI used", () => {
    const answer = "Top picks:\n1. **BookPeople** - the big one.\n2. **First Light Books** - Hyde Park, with a cafe.";
    expect(recountCheck(saved(answer), targets)).toEqual({
      id: "r1",
      business_mentioned: true,
      mention_position: 1,
      competitors_mentioned: [{ name: "First Light Book Shop", position: 2 }],
      extracted_names: null,
    });
  });

  it("does not count ordinary words that match a short brand form", () => {
    expect(recountCheck(saved("Get there at first light for parking."), targets)).toBeNull();
  });

  it("is null when nothing changes or there is no answer text", () => {
    const answer = "1. **BookPeople** - the big one.";
    expect(recountCheck(saved(answer, { business_mentioned: true, mention_position: 1 }), targets)).toBeNull();
    expect(recountCheck({ ...saved(""), answer_text: null }, targets)).toBeNull();
  });

  it("re-matches the saved name extraction, so the extractor and the counts agree", () => {
    const names = { promptVersion: "v1", names: [{ name: "First Light Books", position: 1, matches: null, competitorName: null }] };
    const next = recountCheck(saved("Try First Light Books in Hyde Park.", { extracted_names: names }), targets);
    expect(next?.extracted_names).toEqual({
      promptVersion: "v1",
      names: [{ name: "First Light Books", position: 1, matches: "competitor", competitorName: "First Light Book Shop" }],
    });
    expect(next?.competitors_mentioned).toEqual([{ name: "First Light Book Shop", position: null }]);
  });
});
