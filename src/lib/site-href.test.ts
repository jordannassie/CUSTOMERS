import { describe, expect, it } from "vitest";
import { siteHref } from "./site-href";

describe("siteHref", () => {
  it("links a saved address over https", () => {
    expect(siteHref("pizzahutpk.com")).toBe("https://pizzahutpk.com");
    expect(siteHref("Shop.Bean-House.co.uk")).toBe("https://shop.bean-house.co.uk");
  });
  it("gives nothing for a missing or odd address", () => {
    expect(siteHref(null)).toBeNull();
    expect(siteHref("")).toBeNull();
    expect(siteHref("javascript:alert(1)")).toBeNull();
    expect(siteHref("example.com/path")).toBeNull();
  });
});
