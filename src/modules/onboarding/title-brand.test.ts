import { describe, expect, it } from "vitest";
import { titleBrand } from "./title-brand";

// 2026-10-15: Google names that are page titles get their brand as the suggested name.
describe("titleBrand", () => {
  it("keeps the brand before the tagline", () => {
    expect(titleBrand("Wilshire Smile Studio - Los Angeles Dentist, Cosmetic Dentistry & Implants", "wilshiresmilestudio.com")).toBe(
      "Wilshire Smile Studio",
    );
    expect(titleBrand("Bedigital.pk - Digitizing Businesses - Full Service Digital Agency", "https://bedigital.pk/")).toBe("Bedigital");
    expect(titleBrand("Perfect Med Spa | Botox & Fillers NYC", null)).toBe("Perfect Med Spa");
    expect(titleBrand("Acme Plumbing – 24/7 Emergency Plumber", null)).toBe("Acme Plumbing");
  });

  it("leaves names with no tagline, a hyphen inside a word, or a generic front alone", () => {
    expect(titleBrand("Roto-Rooter Plumbing & Water Cleanup", "rotorooter.com")).toBeNull();
    expect(titleBrand("Wilshire Smile Studio", "wilshiresmilestudio.com")).toBeNull();
    expect(titleBrand("Best Dentist - Los Angeles", null)).toBeNull();
  });

  it("keeps a domain-like front part when it is another site's domain", () => {
    expect(titleBrand("Example.com - Shop", "other.pk")).toBe("Example.com");
  });
});
