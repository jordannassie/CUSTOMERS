import { describe, expect, it } from "vitest";
import { isAllowedEmbedSrc, signupHref } from "./signup";

describe("newsletter signup", () => {
  it("sends each placement to the Beehiiv signup page with its own referral", () => {
    const href = signupHref("homepage");
    const url = new URL(href);
    expect(url.origin + url.pathname).toBe("https://customersdirect.beehiiv.com/");
    expect(url.searchParams.get("modal")).toBe("signup");
    expect(url.searchParams.get("utm_source")).toBe("customers.direct");
    expect(url.searchParams.get("utm_medium")).toBe("website");
    expect(url.searchParams.get("utm_campaign")).toBe("ai-newsletter");
    expect(url.searchParams.get("utm_content")).toBe("homepage");
    expect(new URL(signupHref("footer")).searchParams.get("utm_content")).toBe("footer");
  });

  it("rejects an embed script that is not on Beehiiv", () => {
    expect(isAllowedEmbedSrc(undefined)).toBe(false);
    expect(isAllowedEmbedSrc("")).toBe(false);
    expect(isAllowedEmbedSrc("http://subscribe-forms.beehiiv.com/embed.js")).toBe(false);
    expect(isAllowedEmbedSrc("https://evil.example/embed.js")).toBe(false);
    expect(isAllowedEmbedSrc("https://subscribe-forms.beehiiv.com/embed.js")).toBe(true);
    expect(isAllowedEmbedSrc("https://embeds.beehiiv.com/form")).toBe(true);
  });
});
