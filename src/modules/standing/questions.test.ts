import { describe, expect, it } from "vitest";
import type { StandingCheck } from "./checks";
import { questionSummaries } from "./questions";

const check = (over: Partial<StandingCheck>): StandingCheck => ({ provider: "openai", questionId: "q1", youNamed: false, competitors: [], extracted: null, sites: [], ...over });
const names = (...list: [string, string | null][]) => ({ names: list.map(([name, matches]) => ({ name, matches })) });

describe("questionSummaries", () => {
  it("counts tracked and untracked businesses once per answer, most named first", () => {
    const s = questionSummaries(
      [
        check({ competitors: ["Bean Tires"], extracted: names(["Bean Tires", "competitor"], ["Discount Tire", null], ["Joe's Tires", "business"]), youNamed: true }),
        check({ competitors: ["Bean Tires"], extracted: names(["Discount Tire", null], ["discount tire", null]) }),
        check({ extracted: null }),
      ],
      "joestires.com",
    ).get("q1")!;
    expect(s).toMatchObject({ answers: 3, you: 1 });
    expect(s.named).toEqual([
      { name: "Bean Tires", answers: 2, tracked: true },
      { name: "Discount Tire", answers: 2, tracked: false },
    ]);
  });

  it("lists sites used at least twice in answers that left you out, never your own", () => {
    const s = questionSummaries(
      [
        check({ sites: ["yelp.com", "joestires.com"] }),
        check({ sites: ["yelp.com", "bbb.org", "joestires.com"] }),
        check({ youNamed: true, sites: ["bbb.org"] }),
      ],
      "joestires.com",
    ).get("q1")!;
    expect(s.sitesWithoutYou).toEqual([{ host: "yelp.com", answers: 2 }]);
  });
});
