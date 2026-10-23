import { describe, expect, it } from "vitest";
import nextConfig from "../../next.config";

describe("dev logging (BUG-I)", () => {
  const logging = nextConfig.logging;
  const ignore = logging && logging.incomingRequests && typeof logging.incomingRequests === "object" ? logging.incomingRequests.ignore ?? [] : [];
  const hidden = (url: string) => ignore.some((re) => re.test(url));

  it("never prints Server Function arguments, which hold passwords", () => {
    expect(logging && logging.serverFunctions).toBe(false);
  });

  it("hides request URLs that carry a secret, and keeps the rest", () => {
    expect(hidden("/r/abc123")).toBe(true);
    expect(hidden("/auth/callback?code=xyz")).toBe(true);
    expect(hidden("/email/unsubscribe?token=xyz")).toBe(true);
    expect(hidden("/api/email/unsubscribe?token=xyz")).toBe(true);
    expect(hidden("/dashboard")).toBe(false);
    expect(hidden("/settings/billing?tab=usage")).toBe(false);
  });
});
