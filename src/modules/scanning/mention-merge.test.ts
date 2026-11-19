import { describe, expect, it } from "vitest";
import { matchNames } from "./extract-match";
import { leadingBrand } from "./mention-text";
import { mergeMentions } from "./mention-merge";
import { detectMention, detectMentions, type MentionTarget } from "./mentions";

// Counts that disagreed with the name extractor in the Las Vegas launch test (2026-10-09). Snippets are real answers.
const vegas = { city: "Las Vegas" };
const business: MentionTarget = { name: "Mr. Rooter", ...vegas };
const roto: MentionTarget = { name: "Roto-Rooter Plumbing & Water Cleanup", ...vegas };
const precision: MentionTarget = { name: "Precision Plumbing", ...vegas };

function merged(answer: string, names: string[]) {
  const extracted = names.map((name, i) => ({ name, position: i + 1 }));
  const matched = matchNames(extracted, business, [roto, precision]);
  return mergeMentions(answer, detectMentions(answer, business, [roto, precision]), matched);
}

describe("leadingBrand", () => {
  it("keeps the brand before the service words of a long Google name", () => {
    expect(leadingBrand("Roto-Rooter Plumbing & Water Cleanup")).toBe("Roto-Rooter");
    expect(leadingBrand("Benjamin Franklin Plumbing")).toBe("Benjamin Franklin");
  });

  it("gives nothing for one word, a generic word or a name with no service word", () => {
    expect(leadingBrand("Martinez Plumbing")).toBeNull();
    expect(leadingBrand("Precision Plumbing")).toBeNull();
    expect(leadingBrand("Best Home Services")).toBeNull();
    expect(leadingBrand("Khaadi")).toBeNull();
  });
});

describe("a long Google name", () => {
  it("counts Roto-Rooter for Roto-Rooter Plumbing & Water Cleanup", () => {
    const answer = "1. **Roto-Rooter** - 24/7 service across the valley, upfront pricing.";
    expect(detectMention(answer, roto)).toMatchObject({ mentioned: true, position: 1 });
  });
});

describe("mergeMentions", () => {
  it("counts a generic name the extractor read as a recommended business, with its list position", () => {
    const answer =
      "Top picks:\n1. **Pure Plumbing** - BBB A+.\n2. **Precision Plumbing** - Offers 24/7 emergency services and licensed plumbers.";
    expect(detectMention(answer, precision).mentioned).toBe(false);
    const result = merged(answer, ["Pure Plumbing", "Precision Plumbing"]);
    expect(result.competitors.find((c) => c.name === precision.name)).toEqual({ name: precision.name, mentioned: true, position: 2 });
  });

  it("does not count ordinary words the extractor did not read as a business", () => {
    const answer = "Look for precision plumbing work and fair prices.";
    expect(merged(answer, []).competitors.every((c) => !c.mentioned)).toBe(true);
  });

  it("uses the same rule for the business", () => {
    const answer = "Other options include **Mr. Rooter** for drain cleaning.";
    const result = mergeMentions(answer, detectMentions(answer, { ...business, name: "Mr Rooter Plumbing" }, []), [
      { name: "Mr. Rooter Plumbing", position: 1, matches: "business", competitorName: null },
    ]);
    expect(result.business.mentioned).toBe(true);
  });

  it("keeps text matches when there is no extraction", () => {
    const answer = "1. **Roto-Rooter** - 24/7 service.";
    const result = mergeMentions(answer, detectMentions(answer, business, [roto]), null);
    expect(result.competitors).toEqual([{ name: roto.name, mentioned: true, position: 1 }]);
  });
});
