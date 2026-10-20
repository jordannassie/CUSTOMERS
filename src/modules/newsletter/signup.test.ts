import { describe, expect, it } from "vitest";
import { BEEHIIV_FORM_ID, BEEHIIV_LOADER_SRC, isAllowedEmbedSrc, resolveEmbed, signupHref } from "./signup";

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

  it("uses the official Beehiiv form unless a valid override is set", () => {
    expect(resolveEmbed()).toEqual({ src: BEEHIIV_LOADER_SRC, formId: BEEHIIV_FORM_ID });
    expect(resolveEmbed({ src: "https://evil.example/loader.js", formId: "not-a-form" })).toEqual({
      src: BEEHIIV_LOADER_SRC,
      formId: BEEHIIV_FORM_ID,
    });
    expect(resolveEmbed({ src: "https://cdn.beehiiv.com/loader.js" }).src).toBe("https://cdn.beehiiv.com/loader.js");
  });
});
