import { describe, expect, it } from "vitest";
import type { QuestionAnswer } from "./answers";
import { withFixOptions } from "./fix-options";

const answer = (over: Partial<QuestionAnswer>): QuestionAnswer => ({
  model: "openai",
  label: "ChatGPT",
  checkedAt: "2026-10-20T10:00:00Z",
  namedYou: false,
  competitors: ["Bean House"],
  others: [],
  namesChecked: true,
  sites: [
    { host: "tripadvisor.com", url: "https://tripadvisor.com/x" },
    { host: "yelp.com", url: "https://yelp.com/x" },
  ],
  text: "Try Bean House.",
  reused: false,
  ...over,
});
const ctx = { ownDomain: null, place: null, question: () => "Best coffee?" };

describe("withFixOptions", () => {
  it("opens the saved fix for a site the answer used, with its status, and offers nothing to add", () => {
    const fixes = [{ id: "f1", title: "Get listed on yelp.com", text: "yelp.com", status: "todo" }];
    const [a] = withFixOptions([answer({})], fixes, ctx);
    expect(a.fix).toEqual({ id: "f1", title: "Get listed on yelp.com", host: "yelp.com", status: "todo" });
    expect(a.addFix).toBeNull();
  });

  it("offers to add the fix for the site the link is about when none is saved", () => {
    const [a] = withFixOptions([answer({})], [], { ...ctx, site: "yelp.com" });
    expect(a.fix).toBeNull();
    expect(a.addFix?.dedupeKey).toBe("site:yelp.com");
  });

  it("from a link about one site, never offers another site's fix", () => {
    const fixes = [{ id: "t1", title: "Get listed on tripadvisor.com", text: "tripadvisor.com", status: "open" }];
    const [a] = withFixOptions([answer({})], fixes, { ...ctx, site: "yelp.com" });
    expect(a.fix).toBeNull();
    expect(a.addFix?.dedupeKey).toBe("site:yelp.com");
  });

  it("offers nothing under an answer that named you", () => {
    const [a] = withFixOptions([answer({ namedYou: true })], [], ctx);
    expect(a).toMatchObject({ fix: null, addFix: null });
  });
});
