import { describe, expect, it } from "vitest";
import { placeLabel, splitCityState } from "./place-label";

describe("placeLabel", () => {
  it("adds a short state code, and never a long region", () => {
    expect(placeLabel("Austin", "TX")).toBe("Austin, TX");
    expect(placeLabel("Rawalpindi", "Punjab")).toBe("Rawalpindi");
  });

  it("does not repeat a state the city already names (Austin, TX, TX, 2026-11-16)", () => {
    expect(placeLabel("Austin, TX", "TX")).toBe("Austin, TX");
    expect(placeLabel("Austin, tx", "TX")).toBe("Austin, tx");
  });
});

describe("splitCityState", () => {
  it("splits a city typed with its state code when no state was given", () => {
    expect(splitCityState("Austin, TX", null)).toEqual({ city: "Austin", region: "TX" });
    expect(splitCityState("tulsa, ok", null)).toEqual({ city: "tulsa", region: "OK" });
  });

  it("keeps the text whole otherwise", () => {
    expect(splitCityState("Austin", "TX")).toEqual({ city: "Austin", region: "TX" });
    expect(splitCityState("Rawalpindi, Punjab", null)).toEqual({ city: "Rawalpindi, Punjab", region: null });
    expect(splitCityState("Austin, TX", "CA")).toEqual({ city: "Austin, TX", region: "CA" });
  });

  it("agrees with a matching state that was given separately", () => {
    expect(splitCityState("Austin, TX", "TX")).toEqual({ city: "Austin", region: "TX" });
  });
});
