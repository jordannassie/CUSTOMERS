import { describe, expect, it } from "vitest";
import { COFFEE_SITE_OUTPUT } from "../../fixtures";
import { siteWasRead } from "./dal";

// O1: only saved site facts the AI read count as a finished auto-fill; a blocked site saves only its pages.
describe("siteWasRead", () => {
  it("is true only when the saved facts hold what was read", () => {
    expect(siteWasRead({ domain: "a.example", pages: [{ path: "/", status: "ok" }], facts: COFFEE_SITE_OUTPUT })).toBe(true);
    expect(siteWasRead({ domain: "a.example", pages: [{ path: "/", status: "blocked" }], facts: null })).toBe(false);
    expect(siteWasRead({ domain: "a.example" })).toBe(false);
    expect(siteWasRead(null)).toBe(false);
    expect(siteWasRead("facts")).toBe(false);
  });
});
