import { describe, expect, it } from "vitest";
import { EXTRA_ITEMS, MAIN_ITEMS, isActiveItem } from "./nav-items";

function activeLabels(pathname: string) {
  return [...MAIN_ITEMS, ...EXTRA_ITEMS].filter((item) => isActiveItem(item, pathname)).map((item) => item.label);
}

describe("admin menu (B-64)", () => {
  it("has the six main items in order", () => {
    expect(MAIN_ITEMS.map((item) => item.label)).toEqual([
      "Overview",
      "Agencies",
      "Businesses",
      "Scans",
      "Usage & Cost",
      "Settings",
    ]);
  });

  it.each([
    ["/internal/admin", "Overview"],
    ["/internal/admin/agencies", "Agencies"],
    ["/internal/admin/agencies/abc", "Agencies"],
    ["/internal/admin/businesses/abc", "Businesses"],
    ["/internal/admin/scans", "Scans"],
    ["/internal/admin/usage", "Usage & Cost"],
    ["/internal/admin/settings", "Settings"],
    ["/internal/admin/news", "LinkedIn studio"],
  ])("highlights exactly one item on %s", (pathname, label) => {
    expect(activeLabels(pathname)).toEqual([label]);
  });

  it("does not match a longer path that only shares a prefix", () => {
    expect(activeLabels("/internal/admin/usage-old")).toEqual([]);
  });
});
