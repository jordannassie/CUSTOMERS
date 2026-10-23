import { describe, expect, it } from "vitest";
import { AREA_MAX, areaText, businessProfileInput } from "./schema";

describe("neighborhood or area", () => {
  it("trims it, and saves an empty or blank one as none", () => {
    expect(areaText.parse("  East Austin ")).toBe("East Austin");
    expect(areaText.parse("")).toBeNull();
    expect(areaText.parse("   ")).toBeNull();
    expect(areaText.parse(null)).toBeNull();
  });

  it("allows up to 80 characters, the database limit", () => {
    expect(areaText.parse("a".repeat(AREA_MAX))).toHaveLength(AREA_MAX);
    expect(areaText.safeParse("a".repeat(AREA_MAX + 1)).success).toBe(false);
    // Spaces around it do not count.
    expect(areaText.parse(` ${"a".repeat(AREA_MAX)} `)).toHaveLength(AREA_MAX);
  });
});

describe("business profile input", () => {
  const profile = {
    businessId: "7d1f3c2a-9b4e-4f6a-8c1d-2e3f4a5b6c7d",
    name: "Sunrise Coffee Bar",
    industry: "Coffee shop",
    services: ["espresso"],
    city: "Austin",
    region: "TX",
    country: "US",
    phone: "",
    website: "",
  };

  it("leaves the area out when the form did not send one, so the saved value stays", () => {
    expect(businessProfileInput.parse(profile).area).toBeUndefined();
  });

  it("takes the area the user typed, or none for an empty field", () => {
    expect(businessProfileInput.parse({ ...profile, area: " Hyde Park " }).area).toBe("Hyde Park");
    expect(businessProfileInput.parse({ ...profile, area: "" }).area).toBeNull();
    expect(businessProfileInput.safeParse({ ...profile, area: "x".repeat(81) }).success).toBe(false);
  });
});
