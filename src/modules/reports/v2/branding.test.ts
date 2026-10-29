import { describe, expect, it } from "vitest";
import { DEFAULT_ACCENT, readBranding } from "./branding";

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
