import { describe, expect, it } from "vitest";
import { LIBRARY_INDUSTRIES, servicesPlaceholder } from "./industries";

describe("servicesPlaceholder (BUG-091)", () => {
  it("gives each industry its own examples, never plumbing for a dentist", () => {
    expect(servicesPlaceholder("dentist")).toBe("Cleanings, teeth whitening, implants");
    for (const i of LIBRARY_INDUSTRIES.filter((x) => x !== "plumber")) expect(servicesPlaceholder(i)).not.toMatch(/drain/i);
  });

  it("is neutral for other or no industry", () => {
    expect(servicesPlaceholder("other")).toBe("Your main services, separated by commas");
    expect(servicesPlaceholder("")).toBe("Your main services, separated by commas");
  });
});
