import { describe, expect, it } from "vitest";
import { pageParam, searchParam } from "./schema";

describe("admin list params", () => {
  it("reads the page number, falling back to page 1", () => {
    expect(pageParam.parse("3")).toBe(3);
    for (const bad of [undefined, "0", "-2", "abc", "1.5"]) expect(pageParam.parse(bad)).toBe(1);
  });

  it("keeps only search text that cannot change the database filter", () => {
    expect(searchParam.parse("  Acme   Agency ")).toBe("Acme Agency");
    expect(searchParam.parse('a,b(c)%d*e"f\\g')).toBe("a b c d e f g");
    expect(searchParam.parse(["x"])).toBe("");
    expect(searchParam.parse(undefined)).toBe("");
    expect(searchParam.parse("x".repeat(300))).toHaveLength(100);
  });
});
