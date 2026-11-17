import { describe, expect, it } from "vitest";
import { compareHref, compareTab, DEFAULT_COMPARE_TAB } from "./compare-href";

describe("Compare's address (owner, 2026-11-17: opens on Website, the first tab)", () => {
  it("opens Website when no tab is named, and leaves it out of the address", () => {
    expect(DEFAULT_COMPARE_TAB).toBe("website");
    expect(compareTab(null)).toBe("website");
    expect(compareTab("nonsense")).toBe("website");
    expect(compareHref("abc")).toBe("/competitors/compare?with=abc");
    expect(compareHref("abc", "website")).toBe("/competitors/compare?with=abc");
  });

  it("names every other tab, old names included", () => {
    expect(compareHref("abc", "summary")).toBe("/competitors/compare?with=abc&tab=summary");
    expect(compareHref("abc", "why")).toBe("/competitors/compare?with=abc&tab=summary");
    expect(compareHref("abc", "websites")).toBe("/competitors/compare?with=abc");
    expect(compareHref(null, "google")).toBe("/competitors/compare?tab=google");
  });
});
