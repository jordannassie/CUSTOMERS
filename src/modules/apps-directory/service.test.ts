import { describe, expect, it } from "vitest";
import { DIRECTORY_CATALOG, HOME_FEATURED_SLUGS } from "./catalog";
import { destinationFor, isAllowedReviewUrl, utmFromReferer } from "./schema";
import { mergeCatalog, queryDirectory } from "./service";

const baseQuery = { q: "", category: "all", sort: "name" as const, page: 1 };

describe("apps directory", () => {
  it("lists real apps with https sites and no affiliate deals yet", () => {
    expect(DIRECTORY_CATALOG.length).toBeGreaterThanOrEqual(30);
    expect(DIRECTORY_CATALOG.every((app) => app.websiteUrl.startsWith("https://"))).toBe(true);
    expect(DIRECTORY_CATALOG.every((app) => app.affiliateUrl === null)).toBe(true);
    expect(DIRECTORY_CATALOG.every((app) => app.rating === null && app.reviewCount === null)).toBe(true);
    const reviewed = DIRECTORY_CATALOG.filter((app) => app.reviewUrl);
    expect(reviewed.every((app) => isAllowedReviewUrl(app.reviewUrl))).toBe(true);
    expect(DIRECTORY_CATALOG.find((app) => app.slug === "chatgpt")?.reviewUrl).toBe("https://www.g2.com/products/chatgpt/reviews");
    expect(DIRECTORY_CATALOG.find((app) => app.slug === "canva")?.reviewUrl).toBe("https://www.capterra.com/p/168956/Canva/reviews/");
    expect(DIRECTORY_CATALOG.find((app) => app.slug === "figma")?.reviewUrl).toBeNull();
    expect(new Set(DIRECTORY_CATALOG.map((app) => app.slug)).size).toBe(DIRECTORY_CATALOG.length);
  });

  it("keeps the six homepage apps in order", () => {
    expect(HOME_FEATURED_SLUGS.map((slug) => DIRECTORY_CATALOG.find((app) => app.slug === slug)?.name)).toEqual([
      "ChatGPT",
      "Canva",
      "HubSpot",
      "Meta Ads",
      "Google AI",
      "Notion",
    ]);
  });

  it("searches name, provider, and category", () => {
    const byName = queryDirectory(DIRECTORY_CATALOG, { ...baseQuery, q: "notion" });
    const nameHits = [...byName.featured, ...byName.popular, ...byName.pageItems];
    expect(nameHits.some((app) => app.slug === "notion")).toBe(true);
    const byProvider = queryDirectory(DIRECTORY_CATALOG, { ...baseQuery, q: "anthropic" });
    const providerHits = [...byProvider.featured, ...byProvider.popular, ...byProvider.pageItems];
    expect(providerHits.map((app) => app.slug)).toContain("claude");
    const byCategory = queryDirectory(DIRECTORY_CATALOG, { ...baseQuery, category: "security" });
    expect(byCategory.total).toBeGreaterThan(0);
    expect(byCategory.pageItems.every((app) => app.categories.includes("security"))).toBe(true);
  });

  it("hides an app when an override marks it inactive and prefers an affiliate link", () => {
    const merged = mergeCatalog(DIRECTORY_CATALOG, [{
      ...DIRECTORY_CATALOG[0],
      active: false,
    }]);
    expect(merged.some((app) => app.slug === DIRECTORY_CATALOG[0].slug)).toBe(false);
    expect(destinationFor({ affiliateUrl: "https://partner.example/go", websiteUrl: "https://example.com" }).kind).toBe("affiliate");
    expect(destinationFor({ affiliateUrl: null, websiteUrl: "https://example.com" }).kind).toBe("direct");
    const utm = utmFromReferer("https://customers.direct/apps?utm_source=newsletter&utm_medium=email&utm_campaign=oct");
    expect(utm).toEqual({ utmSource: "newsletter", utmMedium: "email", utmCampaign: "oct" });
    expect(utmFromReferer("https://evil.example/?utm_source=nope").utmSource).toBeNull();
    expect(isAllowedReviewUrl("https://evil.example/reviews")).toBe(false);
    expect(isAllowedReviewUrl("https://www.g2.com/products/chatgpt/reviews")).toBe(true);
  });
});
