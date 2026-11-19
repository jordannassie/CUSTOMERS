import { describe, expect, it } from "vitest";
import { REASONS } from "@/modules/entitlements";
import { explainScanError } from "./error-text";

const PERPLEXITY_CREDIT =
  'Every check failed: perplexity: perplexity returned 403: {"error":{"message":"The Agent API requires paid credits. Add paid credit at https://console.perplexity.ai to upgrade your organization.","type":"restricted_api_key","code":403}}';

describe("explainScanError", () => {
  it("returns null when there is no error", () => {
    expect(explainScanError(null)).toBeNull();
    expect(explainScanError("  ")).toBeNull();
  });

  it("explains an AI tool out of credit, with what the tool said and no code or JSON", () => {
    const result = explainScanError(PERPLEXITY_CREDIT);
    expect(result?.summary).toBe(
      "Perplexity is out of credit. Add credit to the Perplexity account, then retry the scan. No check could run, so no credits were used.",
    );
    expect(result?.details).toBe(
      'Perplexity said: "The Agent API requires paid credits. Add paid credit at https://console.perplexity.ai to upgrade your organization."',
    );
  });

  it("never shows status codes, JSON, error types or provider ids", () => {
    const { summary, details } = explainScanError(PERPLEXITY_CREDIT)!;
    expect(summary).not.toMatch(/403|\{|"|perplexity:/);
    expect(details).not.toMatch(/403|\{|restricted_api_key|returned|perplexity:/);
  });

  it("keeps a plain message sent without JSON, and drops one that reads like code", () => {
    expect(explainScanError("Every check failed: openai: openai returned 401: Incorrect API key provided")?.details).toBe(
      'ChatGPT said: "Incorrect API key provided."',
    );
    expect(explainScanError("Every check failed: anthropic: anthropic returned 500: {}")?.details).toBeNull();
    expect(explainScanError("Every check failed: perplexity: perplexity did not answer within 60000 ms")?.details).toBeNull();
  });

  it("says the same thing once when every tool failed the same way", () => {
    const raw =
      "Every check failed: openai: No sample answers for this kind of business; anthropic: No sample answers for this kind of business; perplexity: No sample answers for this kind of business";
    expect(explainScanError(raw)?.summary).toBe(
      "This is a test account, and test accounts use saved sample answers instead of real AI. There are none for this kind of business yet. No check could run, so no credits were used.",
    );
  });

  it.each([
    ["openai: openai returned 401: Incorrect API key", "ChatGPT didn't accept our key. Check ChatGPT on the System status page."],
    ["anthropic: anthropic returned 400: Your credit balance is too low", "Claude is out of credit. Add credit to the Claude account, then retry the scan."],
    ["openai: openai returned 429: rate limited", "ChatGPT was busy and asked us to slow down. Retry it in a few minutes."],
    ["anthropic: anthropic returned 529: overloaded", "Claude had a problem on its side. Retry it in a few minutes."],
    ["perplexity: perplexity did not answer within 60000 ms", "Perplexity took too long to answer. Retry it in a few minutes."],
    ["openai: openai request failed", "We couldn't reach ChatGPT. Retry it in a few minutes."],
    ["perplexity is not set up (no API key)", "Perplexity isn't connected on this site, so its checks couldn't run."],
    ["openai: openai returned 400: bad request", "The ChatGPT check failed. If it fails again, let the developer know which scan it was."],
  ])("explains %s", (part, sentence) => {
    expect(explainScanError(`Every check failed: ${part}`)?.summary).toBe(`${sentence} No check could run, so no credits were used.`);
  });

  it("explains each tool when several failed differently", () => {
    const raw = "Every check failed: openai: openai returned 429: slow down; perplexity: perplexity did not answer within 60000 ms";
    const { summary } = explainScanError(raw)!;
    expect(summary).toContain("ChatGPT was busy");
    expect(summary).toContain("Perplexity took too long");
  });

  it("leads with the outage wording when the AI tools were not answering", () => {
    const raw =
      "The AI tools were not answering, so this scan could not finish. No credits were used. The next scheduled scan will try again. anthropic: anthropic returned 529: overloaded";
    expect(explainScanError(raw)?.summary).toBe(
      "The AI tools weren't answering, so the scan stopped. No credits were used, and the next scheduled scan will try again. Claude had a problem on its side. Retry it in a few minutes.",
    );
  });

  it("explains a failed scan even when no AI tool is named", () => {
    expect(explainScanError("Every check failed: timeout")).toEqual({
      summary: "No check in this scan could run, so no credits were used. Retry it. If it fails again, let the developer know which scan it was.",
      details: null,
    });
  });

  it("keeps a plain skipped reason as it is, with no details", () => {
    expect(explainScanError("The business is paused.")).toEqual({ summary: "The business is paused.", details: null });
  });

  it("hides a crash message behind a plain sentence", () => {
    const raw = "TypeError: Cannot read properties of undefined (reading 'id')";
    expect(explainScanError(raw)).toEqual({
      summary: "The scan stopped because of an unexpected problem. Retry it. If it fails again, let the developer know which scan it was.",
      details: null,
    });
  });

  it("says what happened to the agency for a skip, not the customer's message", () => {
    expect(explainScanError(REASONS.trialOver)).toEqual({
      summary: "Skipped: the agency's free trial ended and it has not paid yet.",
      details: null,
      noRetry: "Retrying won't help. Scans start again on their own once the agency pays.",
    });
    expect(explainScanError(REASONS.pastDue)?.noRetry).toMatch(/won't help/);
  });

  it("still allows Retry for a skip that a retry can fix", () => {
    expect(explainScanError(REASONS.outOfCredits)).toMatchObject({ summary: expect.stringMatching(/^Skipped: the agency didn't have enough credits for the whole scan/), noRetry: null });
    expect(explainScanError("Claude unavailable, skipped")).toMatchObject({ summary: expect.stringMatching(/^Skipped: Claude was unavailable/), noRetry: null });
    expect(explainScanError("Every check failed: timeout")?.noRetry).toBeUndefined();
  });

  it("never uses long dashes", () => {
    for (const reason of Object.values(REASONS).filter(Boolean)) {
      const text = explainScanError(reason);
      expect(`${text?.summary} ${text?.noRetry ?? ""}`).not.toMatch(/[\u2013\u2014]/);
    }
  });
});
