import { describe, expect, it } from "vitest";
import { DEFAULT_ACCENT, readBranding, isPlaceholderAgencyName, reportAgencyName } from "./branding";

describe("readBranding", () => {
  it("defaults when the column is empty or missing", () => {
    for (const value of [undefined, null, {}, [], "x"]) expect(readBranding(value)).toEqual({ accent: DEFAULT_ACCENT, contactEmail: null, bookingUrl: null });
  });

  it("keeps good values and drops bad ones one by one", () => {
    expect(readBranding({ accent: "#112233", contactEmail: "hi@agency.com", bookingUrl: "https://agency.com/book" })).toEqual({
      accent: "#112233",
      contactEmail: "hi@agency.com",
      bookingUrl: "https://agency.com/book",
    });
    expect(readBranding({ accent: "red", contactEmail: "nope", bookingUrl: "javascript:alert(1)" })).toEqual({ accent: DEFAULT_ACCENT, contactEmail: null, bookingUrl: null });
  });
});

describe("reportAgencyName (QA round 2)", () => {
  it("uses the business name when the agency name is only the start of the owner's email, or empty", () => {
    expect(reportAgencyName("admin", "cd.admin@gmail.com", "Brian's Coffee Spot")).toBe("Brian's Coffee Spot");
    expect(reportAgencyName("cd.admin", "cd.admin@gmail.com", "Brian's Coffee Spot")).toBe("Brian's Coffee Spot");
    expect(reportAgencyName("  ", "owner@shop.com", "Cheezious")).toBe("Cheezious");
    expect(reportAgencyName(null, null, "Cheezious")).toBe("Cheezious");
    expect(isPlaceholderAgencyName("CD.ADMIN@gmail.com", "cd.admin@gmail.com")).toBe(true);
  });

  it("keeps a real agency name", () => {
    expect(reportAgencyName(" Khan Digital ", "owner@khan.digital", "Cheezious")).toBe("Khan Digital");
    expect(isPlaceholderAgencyName("Admin Agency", "admin@agency.com")).toBe(false);
  });
});
