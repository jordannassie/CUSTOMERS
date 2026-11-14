import { describe, expect, it } from "vitest";
import { genericSampleAnswer, sampleNames } from "./generic-sample";
import { recordedAnswers } from "./recorded";

const subject = { business: "Smokey Joe's BBQ", competitors: ["Pit Stop Grill", "Hill Country Ribs", "Brisket Barn"], kind: "restaurant" };

describe("genericSampleAnswer (test mode with no recording of the trade and city)", () => {
  it("gives the same answer for the same question and AI, so test scans repeat", () => {
    const a = genericSampleAnswer(subject, "Best BBQ in Dallas?", "openai", "Dallas");
    expect(genericSampleAnswer(subject, "Best BBQ in Dallas?", "openai", "Dallas")).toEqual(a);
    expect(a.answerText).toContain("Dallas");
    expect(a.answerText).toContain("restaurant");
    expect(a.names).toHaveLength(3);
    for (const name of a.names) expect(a.answerText).toContain(`**${name}**`);
    // No en or em dash (WRITING.md), built from char codes so the copy check does not flag this test.
    for (const dash of [0x2013, 0x2014]) expect(a.answerText).not.toContain(String.fromCharCode(dash));
  });

  it("names the business in some answers and not others, and uses its own competitors", () => {
    const answers = Array.from({ length: 60 }, (_, i) => genericSampleAnswer(subject, `Question ${i}?`, "anthropic", "Dallas"));
    const named = answers.filter((a) => a.names.includes(subject.business)).length;
    expect(named).toBeGreaterThan(5);
    expect(named).toBeLessThan(40);
    expect(answers.some((a) => a.names.includes("Pit Stop Grill"))).toBe(true);
  });

  it("fills in neutral names when the business tracks fewer than three competitors", () => {
    const names = sampleNames({ business: "Solo Dental", competitors: [], kind: "dentist" }, 1, "Lahore");
    expect(names).toHaveLength(3);
    expect(names.some((n) => n.includes("Dentist"))).toBe(true);
  });
});

describe("recordedAnswers fallback", () => {
  it("answers a trade with no recordings from the business itself instead of failing, at no cost", async () => {
    const recorded = recordedAnswers([{ synthetic: true, provider: "openai", question: "Best plumber in Austin?", answerText: "Ace Rooter.", citations: [], industry: "plumber", place: "austin-tx" }], "restaurant", subject);
    const result = await recorded.runCheck("openai")({ question: "Best BBQ in Dallas?", location: { city: "Dallas", region: "TX", country: "US" }, model: "gpt-4.1-mini" });
    expect(result.costUsd).toBe(0);
    expect(result.answerText).toContain("Dallas");
    const names = await recorded.extractNames(result.answerText);
    expect(names.names.length).toBe(3);
  });

  it("still fails without a business to build from (no change for callers that pass none)", async () => {
    const recorded = recordedAnswers([{ synthetic: true, provider: "openai", question: "q", answerText: "a", citations: [], industry: "plumber", place: "austin-tx" }], "restaurant");
    await expect(recorded.runCheck("openai")({ question: "q", location: { city: "Dallas", region: "TX", country: "US" }, model: "gpt-4.1-mini" })).rejects.toThrow(/No sample answers/);
  });
});
