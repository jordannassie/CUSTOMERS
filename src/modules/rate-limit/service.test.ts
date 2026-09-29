import { describe, expect, it, vi } from "vitest";
import { clientIp, createLimiter, LIMITS, memoryStore, rateLimitKey, windowStart } from "./service";

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

  it("lets the request through and logs when the store fails", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const allow = createLimiter({ hit: async () => Promise.reject(new Error("database down")) });
    expect(await allow("contact", "1.2.3.4")).toBe(true);
    expect(log).toHaveBeenCalledOnce();
    expect(String(log.mock.calls[0])).not.toContain("1.2.3.4");
    log.mockRestore();
  });

  it("puts every server on the same window boundaries", () => {
    expect(windowStart(3_600_000 * 5 + 123, 3_600_000)).toBe(3_600_000 * 5);
    expect(windowStart(3_600_000 * 5, 3_600_000)).toBe(3_600_000 * 5);
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
