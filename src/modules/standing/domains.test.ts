import { describe, expect, it } from "vitest";
import type { StandingCheck } from "./checks";
import { domainRows } from "./domains";

const check = (sites: string[], them: boolean, you: boolean) =>
  ({ provider: "openai", questionId: "q", youNamed: you, competitors: them ? ["Bean House"] : [], extracted: null, sites }) as StandingCheck;

describe("domainRows", () => {
  it("counts each site once per answer, with who it named", () => {
    const rows = domainRows([check(["yelp.com", "yelp.com"], true, false), check(["yelp.com"], true, true), check(["maps.google.com"], false, true)], "Bean House");
    expect(rows[0]).toEqual({ host: "yelp.com", answers: 2, them: 2, you: 1, result: "they_win" });
    expect(rows[1]).toEqual({ host: "maps.google.com", answers: 1, them: 0, you: 1, result: "you_win" });
  });
});
