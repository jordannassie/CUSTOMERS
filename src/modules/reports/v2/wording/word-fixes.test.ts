import { describe, expect, it, vi } from "vitest";
import type { FixWordingOutput } from "@/modules/reports/prompts/fix-wording.v1";
import { COFFEE_FIXES, COFFEE_SNAPSHOT, GOOD_COFFEE_WORDING } from "./fixtures";
import { wordFixes, wordFixesWithReport, type FixWordingWriter } from "./word-fixes";

const fakeWriter = (output: FixWordingOutput) =>
  vi.fn<FixWordingWriter>(async () => ({ output, model: "claude-sonnet-5", usage: { inputTokens: 1200, outputTokens: 400 } }));

/** The good rewrite with one fix's field changed. */
function withChange(key: string, change: Partial<FixWordingOutput["fixes"][number]>): FixWordingOutput {
  return { fixes: GOOD_COFFEE_WORDING.fixes.map((f) => (f.key === key ? { ...f, ...change } : f)) };
}

const silent = () => {};

describe("wordFixes", () => {
  it("keeps a rewrite that passes every check, marked ai, and leaves the other fields alone", async () => {
    const writer = fakeWriter(GOOD_COFFEE_WORDING);
    const fixes = await wordFixes(COFFEE_FIXES, COFFEE_SNAPSHOT, { writer, log: silent });
    expect(writer).toHaveBeenCalledTimes(1);
    expect(fixes.map((f) => f.wording)).toEqual(["ai", "ai", "ai"]);
    expect(fixes[0]).toEqual({
      ...COFFEE_FIXES[0],
      title: GOOD_COFFEE_WORDING.fixes[0].title,
      why: GOOD_COFFEE_WORDING.fixes[0].why,
      steps: GOOD_COFFEE_WORDING.fixes[0].steps,
      wording: "ai",
    });
  });

  it("sends one call with every fix's facts, draft and numbers", async () => {
    const writer = fakeWriter(GOOD_COFFEE_WORDING);
    await wordFixes(COFFEE_FIXES, COFFEE_SNAPSHOT, { writer, log: silent });
    const input = writer.mock.calls[0][0];
    expect(input.business).toEqual({ name: "Sunrise Coffee Bar", market: "Springfield, IL", website: "sunrise-coffee.example" });
    expect(input.otherBusinesses).toEqual(["Bean House", "Daily Grind", "Cafe 22"]);
    expect(input.fixes.map((f) => f.key)).toEqual(["own_site_uncited", "source:yelp.com", "theme:oat milk"]);
    expect(input.fixes[0]).toMatchObject({ areas: ["Your website"], priority: "critical", draft: { title: "Get your website quoted by AI" } });
    expect(input.fixes[0].numbers).toEqual(expect.arrayContaining(["2", "60", "14", "5"]));
    expect(input.fixes[2].areas).toEqual(["Your website", "Google Business Profile"]);
  });

  it("a fix with a number the report does not state keeps its template text", async () => {
    const log = vi.fn();
    const output = withChange("source:yelp.com", { why: "AI cited yelp.com in 37 answers. A full listing gives it more to say." });
    const { fixes, report } = await wordFixesWithReport(COFFEE_FIXES, COFFEE_SNAPSHOT, { writer: fakeWriter(output), log });
    expect(fixes.map((f) => f.wording)).toEqual(["ai", "template", "ai"]);
    expect(fixes[1]).toEqual(COFFEE_FIXES[1]);
    expect(report.dropped).toEqual([{ key: "source:yelp.com", issues: ["number not in the report: 37"] }]);
    expect(log).toHaveBeenCalledWith(expect.stringContaining("1 of 3 fixes kept the template wording"));
  });

  it("a fix with a long dash keeps its template text", async () => {
    const output = withChange("theme:oat milk", { title: "Oat milk lattes \u2014 say you serve them" });
    const fixes = await wordFixes(COFFEE_FIXES, COFFEE_SNAPSHOT, { writer: fakeWriter(output), log: silent });
    expect(fixes[2]).toEqual(COFFEE_FIXES[2]);
    expect(fixes.filter((f) => f.wording === "ai")).toHaveLength(2);
  });

  it("a fix that promises a result, or has too many steps, keeps its template text", async () => {
    const promise = withChange("own_site_uncited", { why: "These changes will make ChatGPT recommend you first." });
    const tooMany = withChange("source:yelp.com", { steps: ["Claim it.", "Add photos.", "Add hours.", "Add a menu.", "Reply to reviews."] });
    const output = { fixes: [promise.fixes[0], tooMany.fixes[1], GOOD_COFFEE_WORDING.fixes[2]] };
    const { report } = await wordFixesWithReport(COFFEE_FIXES, COFFEE_SNAPSHOT, { writer: fakeWriter(output), log: silent });
    expect(report.kept).toEqual(["theme:oat milk"]);
    expect(report.dropped[0].issues).toEqual(["promises a result: will make AI name you"]);
    expect(report.dropped[1].issues).toEqual(["needs 2 to 4 steps, has 5"]);
  });

  it("a fix the writer left out keeps its template text, and unknown keys are ignored", async () => {
    const output = { fixes: [GOOD_COFFEE_WORDING.fixes[0], { ...GOOD_COFFEE_WORDING.fixes[1], key: "source:made-up.com" }] };
    const { fixes, report } = await wordFixesWithReport(COFFEE_FIXES, COFFEE_SNAPSHOT, { writer: fakeWriter(output), log: silent });
    expect(fixes.map((f) => f.wording)).toEqual(["ai", "template", "template"]);
    expect(report.dropped.map((d) => d.issues)).toEqual([["no rewrite returned"], ["no rewrite returned"]]);
  });

  it("keeps every template and logs when the writer throws", async () => {
    const log = vi.fn();
    const writer = vi.fn<FixWordingWriter>(async () => {
      throw new Error("AI unavailable: anthropic claude-sonnet-5 overloaded 529");
    });
    const { fixes, report } = await wordFixesWithReport(COFFEE_FIXES, COFFEE_SNAPSHOT, { writer, log });
    expect(fixes).toBe(COFFEE_FIXES);
    expect(report).toMatchObject({ called: true, error: "AI unavailable: anthropic claude-sonnet-5 overloaded 529", kept: [] });
    expect(log).toHaveBeenCalledWith(expect.stringContaining("kept the template wording"));
  });

  it("never calls the writer for a test agency, with no writer, or with no fixes", async () => {
    const writer = fakeWriter(GOOD_COFFEE_WORDING);
    expect(await wordFixes(COFFEE_FIXES, COFFEE_SNAPSHOT, { writer, isTest: true })).toBe(COFFEE_FIXES);
    expect(await wordFixes(COFFEE_FIXES, COFFEE_SNAPSHOT, { writer: null })).toBe(COFFEE_FIXES);
    expect(await wordFixes([], COFFEE_SNAPSHOT, { writer })).toEqual([]);
    expect(writer).not.toHaveBeenCalled();
  });
});
