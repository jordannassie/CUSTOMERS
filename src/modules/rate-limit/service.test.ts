import { describe, expect, it } from "vitest";
import { clientIp, createLimiter, LIMITS, memoryStore, rateLimitKey } from "./service";

describe("rate limiter", () => {
  it(`allows ${LIMITS.compare.max} compare checks an hour per IP, then resets`, async () => {
    const allow = createLimiter(memoryStore());
    const now = 1_000_000;
    for (let i = 0; i < LIMITS.compare.max; i++) expect(await allow("compare", "1.2.3.4", now)).toBe(true);
    expect(await allow("compare", "1.2.3.4", now)).toBe(false);
    expect(await allow("compare", "5.6.7.8", now)).toBe(true);
    expect(await allow("contact", "1.2.3.4", now)).toBe(true);
    expect(await allow("compare", "1.2.3.4", now + LIMITS.compare.windowMs)).toBe(true);
  });

  it("never puts the raw IP in the key", () => {
    expect(rateLimitKey("contact", "203.0.113.9")).not.toContain("203.0.113.9");
    expect(rateLimitKey("contact", "203.0.113.9")).toBe(rateLimitKey("contact", "203.0.113.9"));
  });

  it("prefers the IP header the host sets over one the client can send", () => {
    const headers = new Headers({ "x-forwarded-for": "6.6.6.6, 1.1.1.1", "x-nf-client-connection-ip": "8.8.8.8" });
    expect(clientIp(headers)).toBe("8.8.8.8");
    expect(clientIp(new Headers({ "x-forwarded-for": "9.9.9.9, 1.1.1.1" }))).toBe("9.9.9.9");
    expect(clientIp(new Headers())).toBe("unknown");
  });
});
