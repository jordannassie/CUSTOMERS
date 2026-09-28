import { describe, expect, it } from "vitest";
import { contentSecurityPolicy, securityHeaders } from "./security-headers";

const supabaseUrl = "https://abc.supabase.co";

describe("security headers", () => {
  it("sends HSTS, nosniff, referrer policy and blocks framing", () => {
    const headers = Object.fromEntries(securityHeaders({ supabaseUrl, isDev: false }).map((h) => [h.key, h.value]));
    expect(headers["Strict-Transport-Security"]).toMatch(/max-age=\d{8}/);
    expect(headers["X-Content-Type-Options"]).toBe("nosniff");
    expect(headers["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["X-Frame-Options"]).toBe("DENY");
    expect(headers["Content-Security-Policy"]).toContain("frame-ancestors 'none'");
    expect(headers["Content-Security-Policy-Report-Only"]).toBeDefined();
  });

  it("allows Stripe Elements and our Supabase project, and eval only in dev", () => {
    const csp = contentSecurityPolicy({ supabaseUrl, isDev: false });
    expect(csp).toContain("script-src 'self' 'unsafe-inline' https://js.stripe.com");
    expect(csp).toContain("frame-src https://js.stripe.com https://*.js.stripe.com https://hooks.stripe.com");
    expect(csp).toContain("connect-src 'self' https://abc.supabase.co wss://abc.supabase.co https://api.stripe.com");
    expect(csp).not.toContain("unsafe-eval");
    expect(contentSecurityPolicy({ supabaseUrl, isDev: true })).toContain("'unsafe-eval'");
  });
});
