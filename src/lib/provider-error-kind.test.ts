import { describe, expect, it } from "vitest";
import { providerErrorKind } from "./provider-error-kind";

describe("providerErrorKind", () => {
  it("sorts outside service failures into a few kinds", () => {
    expect(providerErrorKind("Live lookup failed: Places returned 429")).toBe("rate_limit");
    expect(providerErrorKind("Out of credit: Your credit balance is too low")).toBe("billing");
    expect(providerErrorKind("openai returned 401: invalid api key")).toBe("auth");
    expect(providerErrorKind("anthropic did not answer within 30000 ms (timeout)")).toBe("timeout");
    expect(providerErrorKind("503 Service Unavailable")).toBe("server");
    expect(providerErrorKind("TypeError: fetch failed")).toBe("network");
    expect(providerErrorKind("Places sent an unexpected response")).toBe("other");
  });
});
