import { describe, expect, it } from "vitest";
import { sameAliases } from "./service";

describe("sameAliases", () => {
  it("ignores case, order, spaces at the ends and repeats", () => {
    expect(sameAliases(["KFC", "Kentucky"], [" kentucky", "kfc", "KFC"])).toBe(true);
    expect(sameAliases(["KFC"], ["KFC", "Old Name"])).toBe(false);
    expect(sameAliases([], [])).toBe(true);
  });
});
