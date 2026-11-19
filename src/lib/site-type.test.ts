import { describe, expect, it } from "vitest";
import { siteOwner } from "./site-type";

describe("siteOwner", () => {
  it("matches a business by its website's name", () => {
    expect(siteOwner("jfcpizza.com", ["JFC PIZZA & FAST FOOD"])).toBe("JFC PIZZA & FAST FOOD");
    expect(siteOwner("slicetheory.com", ["Pizza Hut", "Slice Theory"])).toBe("Slice Theory");
  });

  it("reads a country ending with a second level (dominos.com.pk, example.co.uk) like .com", () => {
    expect(siteOwner("dominos.com.pk", ["Domino's Pizza | Chaklala-III"])).toBe("Domino's Pizza | Chaklala-III");
    expect(siteOwner("pizzahut.com.pk", ["Pizza Hut"])).toBe("Pizza Hut");
    expect(siteOwner("abacusplumbing.co.uk", ["Abacus Plumbing, Air Conditioning & Electrical"])).toBe("Abacus Plumbing, Air Conditioning & Electrical");
  });

  it("does not match a different business or a too-short name", () => {
    expect(siteOwner("dominos.com.pk", ["Pizza Hut"])).toBeNull();
    expect(siteOwner("abc.com.pk", ["ABC Bakery"])).toBeNull();
    expect(siteOwner("pizza.com", ["Pizza Hut"])).toBeNull();
  });
});
