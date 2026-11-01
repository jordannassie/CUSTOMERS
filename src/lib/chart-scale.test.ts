import { describe, expect, it } from "vitest";
import { axisTicks, axisTop, sparkPoints } from "./chart-scale";

describe("axisTop", () => {
  it("fits the data with a round top", () => {
    expect(axisTop([12, 18, null])).toBe(20);
    expect(axisTop([38, 44])).toBe(50);
    expect(axisTop([0])).toBe(10);
    expect(axisTop([])).toBe(10);
    expect(axisTop([100])).toBe(100);
    expect(axisTicks(50)).toEqual([0, 25, 50]);
  });
});

describe("sparkPoints", () => {
  it("scales a series to its own low and high", () => {
    expect(sparkPoints([10, 12, 11], 20, 10)).toBe("0.0,10.0 10.0,0.0 20.0,5.0");
    expect(sparkPoints([5, 5], 10, 10)).toBe("0.0,5.0 10.0,5.0");
    expect(sparkPoints([null, null], 10, 10)).toBe("");
  });
});
