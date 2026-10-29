import { describe, expect, it } from "vitest";
import { buildExplainInput } from "./facts";
import { COFFEE_SOURCES } from "./fixtures";
import type { ExplainReason } from "./prompts/explain.v2";
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

describe("reasonIssues: no promised results (WRITING.md)", () => {
  it("flags a promise in the title, evidence, why it matters or steps", () => {
    expect(reasonIssues({ ...good, title: "Guaranteed more customers from AI" }, input)).toContain("promises a result: guarantee");
    expect(reasonIssues({ ...good, why_it_matters: "With more reviews you will rank higher in ChatGPT." }, input)).toContain("promises a result: will rank");
    expect(reasonIssues({ ...good, steps: ["Ask for reviews to become #1 in Claude.", "Reply to every review."] }, input)).toContain("promises a result: #1");
    expect(reasonIssues({ ...good, evidence: `${good.evidence} Do this and you rank first.` }, input)).toContain("promises a result: rank first");
    expect(reasonIssues({ ...good, steps: ["Take the top spot on Perplexity.", "Reply to every review."] }, input)).toContain("promises a result: top spot");
    for (const promise of [
      "This is guaranteed to rank you in ChatGPT.",
      "We guarantee results within a month.",
      "Results guaranteed.",
      "It guarantees more customers from AI.",
      "Guaranteed to be recommended by Claude.",
      "This guarantees a higher ranking.",
    ]) {
      expect(reasonIssues({ ...good, why_it_matters: promise }, input), promise).toContain("promises a result: guarantee");
    }
  });

  it("allows a business's own satisfaction guarantee or warranty", () => {
    for (const honest of [
      "Bean House's website mentions its satisfaction guarantee, and yours does not.",
      "Add your 2 year warranty and money-back guarantee to your services page.",
      "List your guaranteed same-day repairs on your website.",
      "Say that every job is guaranteed for 12 months.",
    ]) {
      const issues = reasonIssues({ ...good, why_it_matters: honest }, input);
      expect(issues, honest).not.toEqual(expect.arrayContaining([expect.stringMatching(/^promises a result/)]));
    }
  });

  it("allows the Claude prompt to say not to promise #1, and plain words that only look alike", () => {
    const prompt = "Write a short FAQ for Sunrise Coffee Bar. Do not promise #1 rankings or guaranteed results.";
    expect(reasonIssues({ ...good, fix_on_website: true, category: "content", copy_for_claude: prompt }, input)).toEqual([]);
    expect(reasonIssues({ ...good, steps: ["Reply to review #10 first.", "Ask your first 5 customers for a review."] }, input)).not.toEqual(
      expect.arrayContaining([expect.stringMatching(/^promises a result/)]),
    );
  });
});
