import { describe, expect, it } from "vitest";
import { allowedDomain, canTakeOver, siteState, toSavedSite } from "./service";

describe("allowedDomain", () => {
  const cited = new Set(["beanhouse.example", "yelp.com"]);

  it("accepts the website the user typed or one the AI answers cited, as a bare host", () => {
    expect(allowedDomain("https://www.BeanHouse.example/menu", null, cited)).toBe("beanhouse.example");
    expect(allowedDomain("dailygrind.example", "https://dailygrind.example", cited)).toBe("dailygrind.example");
  });

  it("refuses any other address, so the button can't read just any site", () => {
    expect(allowedDomain("evil.example", null, cited)).toBeNull();
    expect(allowedDomain("not a url", "dailygrind.example", cited)).toBeNull();
  });
});

describe("siteState and canTakeOver (read once, D-85)", () => {
  const now = new Date("2026-10-26T12:00:00Z");
  const done = {
    domain: "beanhouse.example",
    data: { version: 2, status: "read", services: [], hasPhone: null, hasAddress: null, signals: null, claims: [], words: [] },
    fetched_at: "2025-01-01T00:00:00Z",
  };

  it("never lets a finished read be taken over, however old", () => {
    const state = siteState(done);
    expect(state.kind).toBe("done");
    expect(canTakeOver(state, now)).toBe(false);
  });

  it("leaves a running check alone, and takes over one left for more than 10 minutes", () => {
    expect(canTakeOver(siteState({ domain: "x.example", data: { reading: true }, fetched_at: "2026-10-26T11:55:00Z" }), now)).toBe(false);
    expect(canTakeOver(siteState({ domain: "x.example", data: { reading: true }, fetched_at: "2026-10-26T11:49:00Z" }), now)).toBe(true);
  });

  it("replaces a row in an older format, which no screen can show", () => {
    expect(canTakeOver(siteState({ domain: "x.example", data: { version: 1 }, fetched_at: "2026-10-26T11:59:00Z" }), now)).toBe(true);
  });
});

describe("toSavedSite", () => {
  it("reads a row this version wrote and skips any other", () => {
    const data = {
      version: 2,
      status: "read",
      services: [{ name: "catering", page: "/services", quote: "Office catering" }],
      hasPhone: true,
      hasAddress: null,
      signals: null,
      claims: [],
      words: ["catering"],
    };
    expect(toSavedSite({ domain: "beanhouse.example", data, fetched_at: "2026-10-20T00:00:00Z" })).toMatchObject({ status: "read", domain: "beanhouse.example" });
    expect(toSavedSite({ domain: "beanhouse.example", data: { version: 1 }, fetched_at: "2026-10-20T00:00:00Z" })).toBeNull();
  });
});
