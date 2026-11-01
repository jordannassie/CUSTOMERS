// Free: the samples helper (samples.ts) run with fake models, so the paid samples.ai.eval.ts is known to work before
// anyone spends on it. The fakes write the kinds of questions the new rules drop.
import { describe, expect, it } from "vitest";
import type { QuestionModel } from "@/modules/onboarding/question-model";
import { formatSamples, runSamples } from "./samples";

const WRITTEN = [
  "Which toy store in {city} has the best LEGO sets?",
  "Which is cheaper, the toy stores in {city}?",
  "Should I shop at a big chain or a local toy store in {city}?",
  "Which toy store in {city} is better, a chain or a local one?",
  "Is Maple Street Toys the best toy store in {city}?",
  "Which toy store in {city} do parents recommend?",
  "Where can I find educational toys in {city}?",
  "Which toy store in {city} has the best board games?",
  "What is the most trusted toy store in {city}?",
  "Which toy store in {city} has fair prices?",
  "Can you suggest an affordable toy store for puzzles in {city}?",
  "Which toy store in {city} is best for birthday gifts?",
  "I just moved to {city} with two kids, which toy store should we visit first?",
  "Which toy store in {city} has the friendliest staff?",
  "Where do locals buy wooden toys in {city}?",
].map((template, i) => ({ template, intent: (["best", "reviews", "price", "comparison"] as const)[i % 4] }));

const fake = (): QuestionModel => ({
  pick: async ({ templates }) => templates.slice(0, 12).map((t) => t.number),
  write: async () => WRITTEN,
});

describe("question samples helper", () => {
  it("runs the three businesses with each version and lists what the code dropped", async () => {
    const rows = await runSamples([
      { version: "old", model: fake },
      { version: "new", model: fake },
    ]);
    expect(rows.map((r) => r.id)).toEqual(["coffee-austin", "toys-brentwood", "dentist-la"]);
    for (const row of rows) for (const c of row.columns) expect(c.set?.questions.length, `${row.id} ${c.version}`).toBe(12);
    const toys = rows[1].columns[1];
    expect(toys.dropped.map((d) => d.why).sort()).toEqual(["advice", "brand", "choice", "incomplete", "names the business or a competitor"]);
    const all = rows.flatMap((r) => r.columns.flatMap((c) => c.set?.questions.map((q) => q.text) ?? []));
    expect(all.filter((q) => /LEGO|Invisalign|Maple Street|chain or a local|Which is cheaper/i.test(q))).toEqual([]);
    const text = formatSamples(rows);
    expect(text).toContain("| # | old (library) | new (library) |");
    expect(text).toContain("new drafts the code dropped:");
  });
});
