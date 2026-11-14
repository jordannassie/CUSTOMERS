import { describe, expect, it } from "vitest";
import type { StandingCheck } from "./checks";
import { domainRows } from "./domains";

const check = (sites: string[], them: boolean, you: boolean) =>
  ({ provider: "openai", questionId: "q", youNamed: you, competitors: them ? ["Bean House"] : [], extracted: null, sites }) as StandingCheck;

describe("domainRows", () => {
  it("counts each site once per answer, with who it named", () => {
    const rows = domainRows([check(["yelp.com", "yelp.com"], true, false), check(["yelp.com"], true, true), check(["maps.google.com"], false, true)], "Bean House");
    // 2 of 2 against 1 of 2 is inside the margin; one answer is too few to call (audit, 2026-10-28).
    expect(rows[0]).toEqual({ host: "yelp.com", answers: 2, them: 2, you: 1, result: "tie" });
    expect(rows[1]).toEqual({ host: "maps.google.com", answers: 1, them: 0, you: 1, result: "too_few" });
  });

  it("calls a win only when the gap is bigger than the margin", () => {
    const many = Array.from({ length: 9 }, () => check(["yelp.com"], true, false));
    expect(domainRows(many, "Bean House")[0]).toMatchObject({ host: "yelp.com", answers: 9, them: 9, you: 0, result: "they_win" });
  });
});
