import { describe, expect, it } from "vitest";
import { buildExplainInput } from "./facts";
import { COFFEE_SOURCES } from "./fixtures";
import type { ExplainReason } from "./prompts/explain.v1";
import { reasonIssues } from "./validate";

const { input } = buildExplainInput(COFFEE_SOURCES);

const good: ExplainReason = {
  title: "Bean House has more Google reviews than you",
  evidence: "Bean House was named in 5 of 6 AI answers. It has {c1.review_count} Google reviews and you have {you.review_count}.",
  why_it_matters: "AI assistants trust businesses with more reviews.",
  steps: ["Ask your last 10 customers for a review.", "Reply to every review."],
  impact: "high",
  category: "reviews_reputation",
  fix_on_website: false,
  copy_for_claude: "",
};

describe("reasonIssues: only given facts and placeholders", () => {
  it("passes a reason built from the facts", () => {
    expect(reasonIssues(good, input)).toEqual([]);
  });

  it("flags a Google number written out instead of a placeholder", () => {
    expect(reasonIssues({ ...good, evidence: "Bean House has 320 Google reviews at 4.7." }, input)).toEqual([
      "number not in the facts: 320",
      "number not in the facts: 4.7",
    ]);
  });

  it("flags a placeholder that was not offered, or one in the title or Claude prompt", () => {
    expect(reasonIssues({ ...good, evidence: "Rated {c3.rating}." }, input)).toContain("unknown placeholder: {c3.rating}");
    expect(reasonIssues({ ...good, title: "Bean House has {c1.review_count} reviews" }, input)).toContain("placeholder in title");
    expect(reasonIssues({ ...good, fix_on_website: true, copy_for_claude: "Mention {c1.rating}." }, input)).toContain(
      "placeholder in the Claude prompt",
    );
  });

  it("flags a website that is not in the facts, and a large invented number in a step", () => {
    expect(reasonIssues({ ...good, steps: ["List yourself on yellowpages.com.", "Get 50 reviews."] }, input)).toEqual([
      "number not in the facts: 50",
      "website not in the facts: yellowpages.com",
    ]);
  });

  it("flags writing-guide breaks and a website fix with no prompt", () => {
    const issues = reasonIssues({ ...good, why_it_matters: "Reviews unlock trust \u2014 fast.", fix_on_website: true }, input);
    expect(issues).toEqual(expect.arrayContaining(["long dash", "banned word: unlock", "website fix without a Claude prompt"]));
  });
});
