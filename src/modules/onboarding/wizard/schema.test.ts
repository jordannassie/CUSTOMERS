import { describe, expect, it } from "vitest";
import { detailsStepInput } from "./schema";

// The details step (MVP_SPEC 3.1 step 4): the neighborhood or area is optional.
describe("details step input", () => {
  const details = {
    businessId: "7d1f3c2a-9b4e-4f6a-8c1d-2e3f4a5b6c7d",
    name: "Sunrise Coffee Bar",
    industry: "coffee_shop",
    description: "",
    services: [],
    city: "Austin",
    state: "TX",
    country: "US",
    phone: "",
  };

  it("saves the trimmed area, none for an empty field, and refuses one over 80 characters", () => {
    expect(detailsStepInput.parse({ ...details, area: "  East Austin " }).area).toBe("East Austin");
    expect(detailsStepInput.parse({ ...details, area: "" }).area).toBeNull();
    expect(detailsStepInput.safeParse({ ...details, area: "x".repeat(81) }).success).toBe(false);
  });

  it("still accepts details sent without an area", () => {
    expect(detailsStepInput.parse(details).area).toBeUndefined();
  });
});
