import { describe, expect, it } from "vitest";
import type { DirectoryApp } from "@/modules/apps-directory/types";
import { adminApps, appFlags, appName, clickWords } from "./admin-apps";

const base: DirectoryApp = {
  slug: "notion",
  name: "Notion",
  provider: "Notion Labs",
  description: "Notes",
  websiteUrl: "https://notion.so",
  affiliateUrl: null,
  categories: ["productivity"],
  featured: false,
  popular: false,
  topPick: false,
  active: true,
  reviewSource: null,
  reviewUrl: null,
  rating: null,
  reviewCount: null,
  ratingScale: 5,
  ratingLastUpdated: null,
};

describe("admin apps list (admin audit 2026-11-12)", () => {
  it("marks built-in, changed and added apps, and keeps hidden ones so they can be edited", () => {
    const canva = { ...base, slug: "canva", name: "Canva" };
    const changed = { ...base, name: "Notion AI", active: false, featured: true };
    const added = { ...base, slug: "acme", name: "Acme" };
    const rows = adminApps([base, canva], [changed, added]);
    expect(rows.map((r) => [r.slug, r.name, r.origin])).toEqual([
      ["acme", "Acme", "added"],
      ["canva", "Canva", "built-in"],
      ["notion", "Notion AI", "changed"],
    ]);
    expect(appFlags(rows[2])).toEqual(["Hidden", "Featured"]);
    expect(appFlags(rows[1])).toEqual([]);
  });

  it("writes the click log in plain words with the app's name", () => {
    expect(clickWords("homepage", "review")).toBe("Opened its reviews from the home page");
    expect(clickWords("directory", "direct")).toBe("Opened the website from the apps list");
    expect(clickWords("detail", "affiliate")).toBe("Opened the partner link from its page");
    expect(clickWords("detail", "view")).toBe("Viewed its page");
    expect(appName([base], "notion")).toBe("Notion");
    expect(appName([base], "gone")).toBe("gone");
  });
});
