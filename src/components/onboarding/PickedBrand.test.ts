import { describe, expect, it } from "vitest";
import { withBrand } from "./PickedBrand";

// 2026-10-15: a competitor added from Google as "BeRejuved Medical Spa & Wellness Studio - NYC" kept the page title.
describe("withBrand", () => {
  it("starts a Google page title on the brand and keeps the long name as another name", () => {
    expect(withBrand({ name: "BeRejuved Medical Spa & Wellness Studio - NYC", placesId: "ChIJbe" })).toEqual({
      name: "BeRejuved Medical Spa & Wellness Studio",
      placesId: "ChIJbe",
      aliases: ["BeRejuved Medical Spa & Wellness Studio - NYC"],
    });
  });

  it("leaves plain names, and names typed without a Google match, as they are", () => {
    expect(withBrand({ name: "Blue Door Coffee", placesId: "ChIJbd" })).toEqual({ name: "Blue Door Coffee", placesId: "ChIJbd" });
    expect(withBrand({ name: "Glow Spa - NYC", placesId: null })).toEqual({ name: "Glow Spa - NYC", placesId: null });
    expect(withBrand({ name: "Best Dentist - Austin TX", placesId: "ChIJx" }).name).toBe("Best Dentist - Austin TX");
  });
});
