import { describe, expect, it } from "vitest";
import { actionKeys, sourceRows } from "./rows";
import { sourcesView, type SourceCheck } from "./service";

const check = (urls: string[], mentioned = false): SourceCheck => ({
  provider: "openai",
  citations: urls.map((url) => ({ url })),
  checkedAt: "2026-10-20T10:00:00.000Z",
  mentioned,
});

const view = sourcesView(
  [
    check(["https://yelp.com/a", "https://foodpanda.pk/x", "https://facebook.com/p"], true),
    check(["https://yelp.com/b", "https://foodpanda.pk/y"]),
    check(["https://foodpanda.pk/z", "https://randomblog.com/"]),
  ],
  { ownDomain: "beantherecoffee.example" },
);

describe("sourceRows", () => {
  it("looks up every site with an Add to Actions button", () => {
    expect(actionKeys(view).sort()).toEqual(["site:foodpanda.pk", "site:yelp.com"]);
  });

  it("shows sites already added as In Actions, with the column", () => {
    const { listed, rows } = sourceRows(view, { place: null, toolLabel: null }, new Map([["site:foodpanda.pk", { status: "in_progress" as const }]]));
    expect(listed.map((l) => [l.host, l.used, l.impact, l.inActions])).toEqual([
      ["foodpanda.pk", "Used in 3 answers, 2 without naming you.", "high", "in_progress"],
      ["yelp.com", "Used in 2 answers, 1 without naming you.", "medium", null],
    ]);
    const byHost = Object.fromEntries(rows.map((r) => [r.host, r]));
    expect(byHost["foodpanda.pk"]).toMatchObject({ cta: "improve", action: null, inActions: "in_progress" });
    expect(byHost["facebook.com"]).toMatchObject({ cta: "improve", action: null });
    expect(byHost["randomblog.com"]).toMatchObject({ cta: null, action: null });
  });
});
