// Code-only checks, no provider call, so they run on every pull request: the grader, the dataset
// format, and the schema and "nothing invented" checks on the real auto-fill flow fed with fixtures.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { autofill } from "@/modules/onboarding/autofill";
import {
  BLOCKED_DOMAIN,
  BLOCKED_PAGES,
  BLOCKED_PLACE,
  COFFEE_DOMAIN,
  COFFEE_PAGES,
  COFFEE_PLACE,
  COFFEE_SITE_OUTPUT,
  fakeClients,
} from "@/modules/onboarding/fixtures";
import { AUTOFILL_MODEL } from "@/modules/onboarding/prompts/business-autofill.v1";
import { EMPTY_DETAILS } from "@/modules/onboarding/service";
import { apiErrorCase, EXAMPLE_PATH, gradeCase, loadDataset, parseDataset, schemaOk, score } from "./grader";

const examples = parseDataset(readFileSync(EXAMPLE_PATH, "utf8"), { allowExamples: true });

// Fixture sources for each example row, standing in for Firecrawl, Places and Claude.
const fixtureClients = {
  "ba-example-1": () =>
    fakeClients({
      pages: COFFEE_PAGES,
      places: { [COFFEE_DOMAIN]: [COFFEE_PLACE] },
      outputs: { [AUTOFILL_MODEL]: COFFEE_SITE_OUTPUT },
    }),
  "ba-example-2": () => fakeClients({ pages: BLOCKED_PAGES, places: { [BLOCKED_DOMAIN]: [BLOCKED_PLACE] } }),
  "ba-example-3": () => fakeClients(),
} as const;

describe("business auto-fill grader", () => {
  it("reads the example rows, and refuses them as labelled data", () => {
    expect(examples.map((c) => c.id)).toEqual(Object.keys(fixtureClients));
    expect(() => parseDataset(readFileSync(EXAMPLE_PATH, "utf8"), { allowExamples: false })).toThrow(/example rows/);
  });

  it("flags a value the label says no source states as invented, and a different value as wrong", () => {
    const [coffee, blocked] = examples;
    const graded = gradeCase(blocked, { ...EMPTY_DETAILS, ...blocked.expected, industry: "other", services: ["SEO"] });
    expect(graded.invented).toEqual(["industry", "services"]);

    const wrong = gradeCase(coffee, { ...coffee.expected, city: "Chicago", phone: "" });
    expect(wrong).toMatchObject({ invented: [], wrong: ["city"], missed: ["phone"], schemaOk: true });
  });

  it("checks the schema the form receives", () => {
    expect(schemaOk(EMPTY_DETAILS)).toBe(true);
    expect(schemaOk({ ...EMPTY_DETAILS, industry: "bakery" })).toBe(false);
    expect(schemaOk({ ...EMPTY_DETAILS, rating: 4.8 })).toBe(false);
    expect(schemaOk({ ...EMPTY_DETAILS, services: Array(13).fill("x") })).toBe(false);
  });

  it("keeps API errors out of the scores and counts them separately", () => {
    const [coffee, blocked] = examples;
    const result = score([gradeCase(coffee, { ...coffee.expected }), apiErrorCase(blocked, "firecrawl returned 503")]);
    expect(result).toMatchObject({ total: 2, scored: 1, apiErrors: 1, schemaRate: 1, inventedFields: 0 });
  });

  it("validates dataset.v1.jsonl when a person has added it", () => {
    const dataset = loadDataset();
    if (dataset === null) return;
    expect(dataset.length).toBeGreaterThanOrEqual(30);
    expect(new Set(dataset.map((c) => c.id)).size).toBe(dataset.length);
    expect(dataset.some((c) => c.blocksScanners)).toBe(true);
  });
});

describe("business auto-fill on fixtures", () => {
  it("passes schema 100% with zero invented fields (website plus Google, blocked site, nothing found)", async () => {
    const graded = [];
    for (const c of examples) {
      const { clients } = fixtureClients[c.id as keyof typeof fixtureClients]();
      const run = await autofill(c.input, clients);
      graded.push(gradeCase(c, run.result.details));
    }
    const result = score(graded);
    expect(result).toMatchObject({ scored: 3, schemaRate: 1, inventedFields: 0, wrongFields: 0 });
  });
});
