import { describe, expect, it } from "vitest";
import type { StandingCheck } from "@/modules/standing";
import { analyse, type Rival } from "./analysis";
import { detectIssues, priorityOf, rankIssues, toFixes, topIssues, type Issue } from "./issues";
import { check, QUESTIONS, sampleChecks } from "./report.test-helpers";
import { fixSchema } from "./snapshot-schema";

const PH: Rival = { name: "Pizza Hut", names: ["Pizza Hut"], domain: "pizzahut.com.pk", score: 47, collecting: false };
const run = (checks: StandingCheck[], domain: string | null = "cheezious.com", rivals: Rival[] = [PH], youScore = 20) =>
  detectIssues(analyse({ business: { name: "Cheezious", domain, market: "Rawalpindi" }, checks, questions: QUESTIONS, rivals, youScore }));
const byKey = (issues: Issue[], key: string) => issues.find((i) => i.key === key);
const many = (n: number, make: (i: number) => StandingCheck) => Array.from({ length: n }, (_, i) => make(i));

describe("issue rules", () => {
  it("own website never cited is critical when the business has one", () => {
    const issue = byKey(run(many(10, (i) => check("q-price", i < 2, [], ["foodpanda.pk", "bhaipizza.com"]))), "own_site_uncited");
    expect(issue).toMatchObject({ priority: "critical", areas: ["website"], goal: { label: "Done when", text: "cheezious.com appears as a source in the next scan" } });
    expect(issue!.evidence).toBe("cheezious.com was used in 0 of 10 answers. Other business websites were used in 10 answers, bhaipizza.com in 10 of them.");
  });

  it("no website is critical and says so", () => {
    const issue = byKey(run(many(10, (i) => check("q-price", i < 2)), null), "no_site");
    expect(issue).toMatchObject({ priority: "critical", effort: "high", title: "Get a website AI can read" });
    expect(byKey(run(many(10, () => check("q-price", false)), null), "own_site_uncited")).toBeUndefined();
  });

  it("own website used in few answers asks for more, with a number to reach", () => {
    const checks = many(20, (i) => check("q-price", i < 10, [], i === 0 ? ["cheezious.com"] : []));
    expect(byKey(run(checks), "own_site_low")).toMatchObject({ priority: "high", goal: { label: "Target for next scan", text: "Used as a source in 2 or more answers" } });
    expect(run(many(10, (i) => check("q-price", true, [], i < 3 ? ["cheezious.com"] : []))).some((i) => i.key.startsWith("own_site"))).toBe(false);
  });

  it("a Google source that never names you", () => {
    const checks = many(10, (i) => check("q-near", false, i < 6 ? ["Pizza Hut"] : [], ["google.com", "cheezious.com"]));
    const issue = byKey(run(checks), "source:google")!;
    expect(issue).toMatchObject({ areas: ["google"], where: "Google Business Profile", effort: "low", priority: "high" });
    expect(issue.evidence).toBe("Google was used in 10 answers and named you in none. 6 of those answers named Pizza Hut.");
    expect(issue.goal).toEqual({ label: "Done when", text: "Google sourced answers start naming Cheezious" });
  });

  it("a delivery app, review site, guide or social site used often with few mentions", () => {
    const checks = many(20, (i) =>
      check("q-price", i === 0, i < 8 ? ["Pizza Hut"] : [], ["cheezious.com", ...(i < 10 ? ["foodpanda.pk", "tripadvisor.com", "tiktok.com", "foodieguide.pk"] : [])]),
    );
    const issues = run(checks);
    expect(byKey(issues, "source:foodpanda")).toMatchObject({ areas: ["delivery"], owner: "Operations", title: "Turn Foodpanda mentions into picks" });
    expect(byKey(issues, "source:foodpanda")!.goal).toEqual({ label: "Target for next scan", text: "Named in 3 or more Foodpanda sourced answers" });
    expect(byKey(issues, "source:tripadvisor")).toMatchObject({ areas: ["reviews"] });
    expect(byKey(issues, "source:tiktok")).toMatchObject({ areas: ["social"], owner: "Social media" });
    expect(byKey(issues, "source:foodieguide.pk")).toMatchObject({ areas: ["blogs"] });
  });

  it("leaves out a source that names you often, or is used too little", () => {
    const checks = many(20, (i) => check("q-price", i < 10, [], ["cheezious.com", ...(i < 6 ? ["thecookbook.pk"] : []), ...(i === 19 ? ["yelp.com"] : [])]));
    const issues = run(checks);
    expect(byKey(issues, "source:thecookbook.pk")).toBeUndefined();
    expect(byKey(issues, "source:yelp")).toBeUndefined();
  });

  it("a question theme with few mentions", () => {
    const checks = [...many(6, (i) => check("q-quality", i === 0, ["Pizza Hut"], ["cheezious.com"])), ...many(6, () => check("q-price", true, [], ["cheezious.com"]))];
    const issue = byKey(run(checks), "theme:quality")!;
    expect(issue.evidence).toBe("Named in 1 of 6 quality answers. Pizza Hut was named in 6.");
    expect(issue.goal).toEqual({ label: "Target for next scan", text: "Named in 2 or more of 6 quality answers" });
    expect(byKey(run(checks), "theme:price")).toBeUndefined();
  });

  it("a competitor ahead that wins through one listing", () => {
    // Yelp names you in half its answers, so it is no gap on its own, but Pizza Hut wins most of its answers.
    const checks = [
      ...many(4, (i) => check("q-price", i < 2, ["Pizza Hut"], ["yelp.com", "cheezious.com"])),
      ...many(16, (i) => check("q-price", i < 8, [], ["cheezious.com"])),
    ];
    const issue = run(checks).find((i) => i.key.startsWith("rival:"));
    expect(issue).toMatchObject({ key: "rival:pizza-hut:yelp", title: "Catch up with Pizza Hut on Yelp", areas: ["reviews"] });
    expect(issue!.evidence).toBe("Yelp was used in 4 answers that named Pizza Hut, and named you in 2 of its 4 answers.");
  });

  it("finds nothing with no answers", () => {
    expect(run([])).toEqual([]);
  });
});

describe("priority and order", () => {
  it("scores points into priorities", () => {
    expect([5, 4, 3, 2, 1].map(priorityOf)).toEqual(["high", "high", "medium", "low", "low"]);
  });

  it("keeps the top 6 in priority order, numbered, with template wording that parses", () => {
    const issues = run(sampleChecks(), "cheezious.com", [PH, { name: "Domino's", names: ["Domino's"], domain: null, score: 17, collecting: false }]);
    expect(issues.length).toBeGreaterThan(6);
    const fixes = toFixes(topIssues(issues));
    expect(fixes.map((f) => [f.n, f.key, f.priority])).toEqual([
      [1, "own_site_uncited", "critical"],
      [2, "source:google", "high"],
      [3, "source:foodpanda", "medium"],
      [4, "theme:quality", "medium"],
      [5, "theme:speed", "medium"],
      [6, "source:tripadvisor", "low"],
    ]);
    for (const f of fixes) {
      expect(fixSchema.safeParse(f).success).toBe(true);
      expect(f.wording).toBe("template");
      expect(f.evidence).toMatch(/\d/);
    }
  });

  it("orders the same issues the same way whatever order they come in", () => {
    const issues = run(sampleChecks());
    expect(rankIssues([...issues].reverse()).map((i) => i.key)).toEqual(rankIssues(issues).map((i) => i.key));
  });
});
