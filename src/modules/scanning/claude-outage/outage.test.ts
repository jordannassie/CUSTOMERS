import { describe, expect, it } from "vitest";
import { ProviderError, type ProviderErrorKind } from "../providers/request";
import type { ProviderId } from "../providers/types";
import { CLAUDE_OUTAGE_MINUTES, claudeMode, outageMessage, outageReason } from "./outage";

const error = (status: number | null, message: string, kind: ProviderErrorKind = "client", provider: ProviderId = "anthropic") =>
  new ProviderError({ provider, kind, status, attempts: 1, message });

// What the deploy preview gets today with a bad key (provider_errors, 2026-10-23).
const PREVIEW_ERROR =
  'anthropic returned 401: 401 {"type":"error","error":{"type":"authentication_error","message":"invalid x-api-key"},"request_id":"req_011CgJo9Jn4uQ7tnYYLnVzUb"}';
const CREDIT_ERROR =
  'anthropic returned 400: {"type":"error","error":{"type":"invalid_request_error","message":"Your credit balance is too low to access the Anthropic API. Please go to Plans & Billing to upgrade or purchase credits."}}';

describe("outageReason", () => {
  it("takes the preview's invalid key error as an auth outage", () => {
    expect(outageReason(error(401, PREVIEW_ERROR))).toBe("auth");
  });

  it("takes a key without permission as an auth outage", () => {
    expect(outageReason(error(403, 'anthropic returned 403: {"type":"permission_error"}'))).toBe("auth");
  });

  it("takes an empty account as a credit outage", () => {
    expect(outageReason(error(400, CREDIT_ERROR))).toBe("credit");
  });

  // One of these says nothing about the next call: only a whole scan of them marks Claude down (gate.ts, BUG-285).
  it("does not count rate limits, timeouts, server errors or other bad requests", () => {
    expect(outageReason(error(429, "anthropic returned 429: rate_limit_error", "rate_limit"))).toBeNull();
    expect(outageReason(error(null, "anthropic did not answer within 30000 ms", "timeout"))).toBeNull();
    expect(outageReason(error(529, "anthropic returned 529: overloaded_error", "server"))).toBeNull();
    expect(outageReason(error(400, 'anthropic returned 400: {"message":"max_tokens: too large"}'))).toBeNull();
  });

  it("is only about Claude", () => {
    expect(outageReason(error(401, "openai returned 401: Incorrect API key", "client", "openai"))).toBeNull();
    expect(outageReason(new Error("anthropic returned 401"))).toBeNull();
  });
});

describe("claudeMode", () => {
  const now = new Date("2026-10-23T12:00:00Z");
  const outage = (minutesAgo: number) => {
    const at = new Date(now.getTime() - minutesAgo * 60_000);
    return { since: at, lastSeenAt: at, reason: "auth" as const };
  };

  it("asks Claude when nothing is open", () => {
    expect(claudeMode(null, now)).toBe("use");
  });

  it("skips Claude inside the window and probes once it has passed", () => {
    expect(claudeMode(outage(5), now)).toBe("skip");
    expect(claudeMode(outage(CLAUDE_OUTAGE_MINUTES - 1), now)).toBe("skip");
    expect(claudeMode(outage(CLAUDE_OUTAGE_MINUTES), now)).toBe("probe");
  });
});

describe("outageMessage", () => {
  it("says what is wrong, what scans do meanwhile, and the fix", () => {
    expect(outageMessage("auth")).toContain("rejected the API key");
    expect(outageMessage("credit")).toContain("out of credit");
    expect(outageMessage("auth")).toContain("Scans run on ChatGPT and Perplexity");
  });

  it("says plainly when Claude is not answering, and when scans try it again (BUG-285)", () => {
    const text = outageMessage("down");
    expect(text).toContain("Claude is not answering (server errors or timeouts)");
    expect(text).toContain(`try it again after ${CLAUDE_OUTAGE_MINUTES} minutes`);
    expect(text).not.toMatch(/[–—]/);
  });
});
