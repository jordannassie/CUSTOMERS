import { describe, expect, it } from "vitest";
import { bestQuote, claimsAskedBy, meaningWords, siteClaims, siteWords, tidyQuote } from "./site-claims";

describe("siteClaims", () => {
  it("quotes the plain sentence that makes the claim, without page formatting", () => {
    const claims = siteClaims([
      { path: "/", markdown: "# Bean House\n\nFresh beans to go. Roasting since 2009.\n\n## Hours\n\nMonday to Sunday" },
      { path: "/faq", markdown: "## FAQ\n\n- **Free quotes** for office catering of any size" },
    ]);
    expect(claims).toEqual([
      { key: "free_estimates", label: "free estimates", page: "/faq", quote: "Free quotes for office catering of any size" },
      { key: "years", label: "years in business", page: "/", quote: "Roasting since 2009." },
    ]);
  });
});

describe("claimsAskedBy", () => {
  it("knows which claims a question is about", () => {
    expect(claimsAskedBy("Emergency plumber open now in Dallas?")).toEqual(["open_24_7", "emergency", "same_day"]);
    expect(claimsAskedBy("What is an affordable roofer?")).toEqual(["prices", "free_estimates", "financing"]);
    expect(claimsAskedBy("Tire shop in Plano")).toEqual([]);
  });
});

describe("words", () => {
  it("keeps meaning words, singular, once per site", () => {
    expect(meaningWords("Which tire shop in Plano has the best prices?")).toEqual(["tire", "plano", "price"]);
    expect(siteWords([{ markdown: "Tires and tires" }, { markdown: "Plano" }])).toEqual(["tire", "plano"]);
  });
});

describe("bestQuote", () => {
  it("prefers a sentence over a menu label or a page title", () => {
    const pages = [
      { path: "/", markdown: "Pizza Hut Pakistan \\ Order Pizza Online - Fast Home Delivery\n\n- DELIVERY\n- MENU" },
      { path: "/delivery", markdown: "We offer free delivery on every order over Rs. 1,500 across Lahore." },
    ];
    expect(bestQuote(pages, /\bdelivery\b/i)).toEqual({ page: "/delivery", quote: "We offer free delivery on every order over Rs. 1,500 across Lahore." });
  });
});

describe("tidyQuote", () => {
  it("turns a page title's separators into commas and ALL CAPS into a sentence, keeping their words", () => {
    expect(tidyQuote("Pizza Hut Pakistan \\ Order Pizza Online - Fast Home Delivery")).toBe("Pizza Hut Pakistan, Order Pizza Online, Fast Home Delivery");
    expect(tidyQuote("DELIVERY")).toBe("Delivery");
    expect(tidyQuote("Roasting since 2009.")).toBe("Roasting since 2009.");
  });
});
