import { describe, expect, it } from "vitest";
import robots from "@/app/robots";
import { PRIVATE_PATHS, PUBLIC_PAGES, SITE_URL, sitemapEntries } from "./site-metadata";

// How a crawler reads a Disallow line: a plain prefix match on the path.
const blocked = (path: string) => PRIVATE_PATHS.some((rule) => path.startsWith(rule));

describe("sitemap", () => {
  it("lists only the kept public pages", () => {
    const urls = sitemapEntries(new Date(0)).map((entry) => entry.url);
    expect(urls).toEqual(
      ["/", "/pricing", "/agency", "/compare", "/contact", "/privacy", "/terms"].map((path) => `${SITE_URL}${path}`),
    );
  });
});

describe("robots", () => {
  it("points crawlers at the sitemap", () => {
    expect(robots().sitemap).toBe(`${SITE_URL}/sitemap.xml`);
  });

  it.each(["/dashboard", "/sources/abc", "/competitors", "/settings/billing", "/onboarding", "/internal/admin", "/r/abc123", "/api/contact"])(
    "blocks %s",
    (path) => {
      expect(blocked(path)).toBe(true);
    },
  );

  it("keeps every public page and the auth pages crawlable", () => {
    for (const path of [...PUBLIC_PAGES.map((page) => page.path), "/login", "/signup", "/reset-password"]) {
      expect(blocked(path), path).toBe(false);
    }
  });
});
