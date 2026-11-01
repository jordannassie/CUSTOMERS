import { describe, expect, it } from "vitest";
import { sourceOf } from "./sources";
import { themeOf } from "./themes";

describe("themeOf", () => {
  it.each([
    ["Cheap pizza deals in Rawalpindi", "price"],
    ["Affordable dentist near me", "price"],
    ["Best pizza in Rawalpindi", "quality"],
    ["Most experienced roofer in Austin", "quality"],
    ["Fastest pizza delivery in Rawalpindi", "speed"],
    ["Emergency plumber open now", "speed"],
    ["Most reliable electrician with good reviews", "trust"],
    ["Top rated hair salon", "trust"],
    ["Coffee shop near me", "nearby"],
    ["Which law firms handle divorce cases", "other"],
  ])("%s is %s", (question, theme) => {
    expect(themeOf(question)).toBe(theme);
  });
});

describe("sourceOf", () => {
  it("groups every Google host as Google", () => {
    for (const host of ["google.com", "maps.google.com", "google.com.pk", "g.page"]) expect(sourceOf(host, "cheezious.com")).toMatchObject({ key: "google", area: "google" });
  });

  it("groups a brand across country domains and gives it its area", () => {
    expect(sourceOf("foodpanda.pk", null)).toEqual({ key: "foodpanda", label: "Foodpanda", area: "delivery", kind: "delivery" });
    expect(sourceOf("tripadvisor.co.uk", null)).toMatchObject({ key: "tripadvisor", label: "TripAdvisor", area: "reviews" });
    expect(sourceOf("tiktok.com", null)).toMatchObject({ label: "TikTok", area: "social" });
    expect(sourceOf("yellowpages.com", null)).toMatchObject({ label: "Yellow Pages", area: "directories" });
    expect(sourceOf("thecookbook.pk", null)).toMatchObject({ key: "thecookbook.pk", label: "thecookbook.pk", area: "blogs" });
  });

  it("tells your site and other businesses' sites apart", () => {
    expect(sourceOf("cheezious.com", "cheezious.com")).toMatchObject({ key: "own", area: "website" });
    expect(sourceOf("pizzahut.com.pk", "cheezious.com", true)).toMatchObject({ area: "other", kind: "competitor" });
    expect(sourceOf("constructor.com", null)).toMatchObject({ key: "constructor.com" });
  });
});
