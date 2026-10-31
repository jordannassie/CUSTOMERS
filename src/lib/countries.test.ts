import { describe, expect, it } from "vitest";
import { countryCode, countryName, countryOptions } from "./countries";

describe("countries (BUG-086)", () => {
  it("turns what a business saved into an ISO code, and never guesses the US", () => {
    expect(countryCode("PK")).toBe("PK");
    expect(countryCode("pk")).toBe("PK");
    expect(countryCode("Pakistan")).toBe("PK");
    expect(countryCode("United States")).toBe("US");
    expect(countryCode("USA")).toBe("US");
    expect(countryCode("UK")).toBe("GB");
    expect(countryCode("United Kingdom")).toBe("GB");
    expect(countryCode("Atlantis")).toBe("");
    expect(countryCode("ZZ")).toBe("");
    expect(countryCode("")).toBe("");
    expect(countryCode(null)).toBe("");
  });

  it("lists every country by name for the form", () => {
    const options = countryOptions();
    expect(options.length).toBeGreaterThan(240);
    expect(options).toContainEqual({ code: "PK", name: "Pakistan" });
    expect(options.map((o) => o.name)).toEqual([...options.map((o) => o.name)].sort((a, b) => a.localeCompare(b)));
    expect(countryName("US")).toBe("United States");
  });
});
