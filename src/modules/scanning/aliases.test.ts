import { describe, expect, it } from "vitest";
import { detectMention, detectMentions } from "./mentions";
import { mentionTargets, recountCheck, type SavedCheck } from "./recount/service";

// Other names for the business and its competitors (MVP_SPEC 5.5, migration 055): an answer that uses one counts, the
// same rules as the name itself apply to it, and taking it away stops it counting, also for saved answers.

describe("other names in answers", () => {
  const kfc = { name: "Kentucky Fried Chicken", city: "Islamabad", website: "kfcpakistan.com" };

  it("counts an answer that uses an other name, and stops counting once it is removed", () => {
    const answer = "Good fried chicken nearby:\n1. KFC, Blue Area\n2. Howdy";
    expect(detectMention(answer, { ...kfc, aliases: ["KFC"] })).toEqual({ mentioned: true, position: 1, matchedBy: "alias" });
    expect(detectMention(answer, { ...kfc, aliases: [] })).toMatchObject({ mentioned: false });
  });

  it("keeps the short-name rules: a short brand in lowercase prose needs the city nearby", () => {
    const target = { ...kfc, aliases: ["KFC"] };
    expect(detectMention("We tried a kfc style bucket at home.", target).mentioned).toBe(false);
    expect(detectMention("The kfc in Islamabad is open late.", target).mentioned).toBe(true);
  });

  it("keeps the spacing rule: Book Woman and BookWoman are one name", () => {
    const shop = { name: "Book Woman Austin LLC", city: "Austin", website: "ebookwoman.com" };
    expect(detectMention("Try BookWoman on Burnet Road.", { ...shop, aliases: ["Book Woman"] }).mentioned).toBe(true);
    expect(detectMention("Try Book Woman on Burnet Road.", { ...shop, aliases: ["BookWoman"] }).mentioned).toBe(true);
    // A one-word other name must still read as a name.
    expect(detectMention("Ask any bookwoman you know.", { name: "Zzq Books", aliases: ["BookWoman"] }).mentioned).toBe(false);
  });

  it("counts a competitor's other name for that competitor", () => {
    const { competitors } = detectMentions("1. KFC\n2. Savour Foods", { name: "Howdy" }, [{ ...kfc, aliases: ["KFC"] }, { name: "Savour Foods" }]);
    expect(competitors).toEqual([
      { name: "Kentucky Fried Chicken", mentioned: true, position: 1, matchedBy: "alias" },
      { name: "Savour Foods", mentioned: true, position: 2, matchedBy: "name" },
    ]);
  });
});

describe("saved answers checked again for other names", () => {
  const saved = (answer: string, extra: Partial<SavedCheck> = {}): SavedCheck => ({
    id: "r1",
    answer_text: answer,
    extracted_names: null,
    business_mentioned: false,
    mention_position: null,
    competitors_mentioned: [],
    ...extra,
  });
  const business = { name: "Book Woman Austin LLC", domain: "ebookwoman.com", city: "Austin", phone: null, hasWebsite: true };
  const rival = { name: "Kentucky Fried Chicken", domain: null, phone: null, city: null };
  const answer = "Bookshops:\n1. **BookWoman** on Burnet\n2. **KFC** next door, for snacks";

  it("counts the business and a competitor once their other names are added", () => {
    const targets = mentionTargets({ ...business, aliases: ["BookWoman"] }, [{ ...rival, aliases: ["KFC"] }]);
    expect(recountCheck(saved(answer), targets)).toMatchObject({
      business_mentioned: true,
      mention_position: 1,
      competitors_mentioned: [{ name: "Kentucky Fried Chicken", position: 2 }],
    });
  });

  it("stops counting them once the other names are removed", () => {
    const counted = { business_mentioned: true, mention_position: 1, competitors_mentioned: [{ name: "Kentucky Fried Chicken", position: 2 }] };
    const targets = mentionTargets({ ...business, aliases: [] }, [{ ...rival, aliases: [] }]);
    expect(recountCheck(saved(answer, counted), targets)).toMatchObject({
      business_mentioned: false,
      mention_position: null,
      competitors_mentioned: [],
    });
  });
});
