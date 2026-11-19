import { describe, expect, it } from "vitest";
import { averagePlace, ordinal, placeOf, placeText } from "./places";

describe("place in the answer (D-63, behind SHOW_POSITION)", () => {
  it("reads each AI's list item for a question at one scan", () => {
    expect(placeOf([])).toBeNull();
    expect(placeOf([{ named: true, position: 3 }, { named: true, position: 1 }, { named: false, position: null }])).toEqual({ named: true, positions: [1, 3] });
    expect(placeOf([{ named: true, position: null }])).toEqual({ named: true, positions: [] });
    expect(placeOf([{ named: false, position: null }])).toEqual({ named: false, positions: [] });
  });

  it("says it in words, never as a rank", () => {
    expect(placeText({ named: true, positions: [2] })).toBe("named 2nd");
    expect(placeText({ named: true, positions: [1, 3] })).toBe("named 1st and 3rd");
    expect(placeText({ named: true, positions: [1, 2, 11] })).toBe("named 1st, 2nd and 11th");
    expect(placeText({ named: true, positions: [] })).toBe("named, not in a list");
    expect(placeText({ named: false, positions: [] })).toBe("not named");
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 101].map(ordinal)).toEqual(["1st", "2nd", "3rd", "4th", "11th", "12th", "13th", "21st", "22nd", "101st"]);
  });

  it("averages only answers that named the business in a list", () => {
    expect(averagePlace([{ named: true, position: 1 }, { named: true, position: 2 }, { named: true, position: 2 }, { named: true, position: null }, { named: false, position: null }])).toEqual({ value: 1.7, answers: 3 });
    expect(averagePlace([{ named: true, position: null }])).toBeNull();
  });
});
