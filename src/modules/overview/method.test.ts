import { describe, expect, it } from "vitest";
import { listNames, methodPanel, type MethodInput } from "./method";

const input: MethodInput = {
  windowDays: 30,
  label: "Good confidence",
  confidence: "good",
  margin: 8,
  checks: 1080,
  uniqueAnswers: 84,
  models: [
    { id: "openai", label: "ChatGPT", score: 75, margin: 11 },
    { id: "anthropic", label: "Claude", score: null, margin: null },
    { id: "perplexity", label: "Perplexity", score: 48, margin: 1 },
  ],
};

describe("methodPanel", () => {
  it("reads the same as the approved wording", () => {
    expect(methodPanel(input, null)).toMatchSnapshot();
  });

  it("says how sure the score is as how it improves, from the confidence bands (D-64)", () => {
    expect(methodPanel(input, null).accuracy).toEqual({
      level: "good",
      label: "Good confidence",
      margin: "Give or take 8 points",
      note: "Gets sharper with every scan: 117 more different answers for high confidence.",
    });
    expect(methodPanel({ ...input, confidence: "early", label: "Early estimate", uniqueAnswers: 49 }, null).accuracy.note).toBe(
      "Gets sharper with every scan: 1 more different answer for good confidence.",
    );
    expect(methodPanel({ ...input, confidence: "high", uniqueAnswers: 240 }, null).accuracy.note).toBe("Based on 240 different answers.");
  });

  it("shows nothing about the real apps until the calibration check is done (B-76)", () => {
    expect(methodPanel(input, null).calibration).toBeNull();
  });

  it("shows the agreement per AI once a calibration result exists", () => {
    const panel = methodPanel(input, { checkedOn: "2026-11-03", agreement: { openai: 84.6, perplexity: 90 } });
    expect(panel.calibration).toMatchSnapshot();
  });

  it("has no long dashes anywhere in the text", () => {
    const text = JSON.stringify(methodPanel(input, { checkedOn: "2026-11-03", agreement: { openai: 80 } }));
    expect(text).not.toMatch(/[\u2013\u2014]/);
  });
});

describe("listNames", () => {
  it("joins names the way a person would", () => {
    expect(listNames(["ChatGPT"])).toBe("ChatGPT");
    expect(listNames(["ChatGPT", "Claude"])).toBe("ChatGPT and Claude");
    expect(listNames(["ChatGPT", "Claude", "Perplexity"])).toBe("ChatGPT, Claude and Perplexity");
  });
});
