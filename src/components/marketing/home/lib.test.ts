import { describe, expect, it } from "vitest";
import { isValidDomain, smoothPath } from "./lib";

describe("isValidDomain", () => {
  it.each(["beanhouse.com", "https://beanhouse.com/menu", "http://shop.bean-house.co.uk?x=1", " dailygrind.com "])(
    "accepts %s",
    (v) => expect(isValidDomain(v)).toBe(true),
  );

  it.each(["", "beanhouse", "bean house.com", "-bean.com", "https://", "bean.c"])("rejects %s", (v) =>
    expect(isValidDomain(v)).toBe(false),
  );
});

describe("smoothPath", () => {
  it("starts at the first value and ends at the last, scaled to the box", () => {
    const d = smoothPath([0, 50, 100], 200, 100);
    expect(d.startsWith("M 0.0 100.0")).toBe(true);
    expect(d.endsWith("200.0 0.0")).toBe(true);
    expect(d.match(/ C /g)).toHaveLength(2);
  });
});
