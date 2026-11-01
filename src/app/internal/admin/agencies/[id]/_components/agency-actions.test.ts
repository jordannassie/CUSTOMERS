import { describe, expect, it } from "vitest";
import { wholeNumberError } from "./agency-actions";

// The credit and trial forms check their numbers themselves (noValidate), so the message shows under the field.
describe("wholeNumberError", () => {
  it("accepts a whole number from 1 to the limit", () => {
    expect(wholeNumberError("1", 30, "days")).toBeUndefined();
    expect(wholeNumberError("30", 30, "days")).toBeUndefined();
  });
  it.each(["", " ", "0", "-3", "2.5", "31", "abc", null])("refuses %j", (value) => {
    expect(wholeNumberError(value, 30, "days")).toBe("Enter a whole number of days from 1 to 30.");
  });
  it("writes a large limit with a comma", () => {
    expect(wholeNumberError("0", 100_000, "credits")).toBe("Enter a whole number of credits from 1 to 100,000.");
  });
});
