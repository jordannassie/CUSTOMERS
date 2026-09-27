// Code-only checks of the grader and the dataset format; no model call, so it runs on every pull request.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { apiErrorCase, EXAMPLE_PATH, gradeCase, loadDataset, parseDataset, score } from "./grader";

const examples = parseDataset(readFileSync(EXAMPLE_PATH, "utf8"), { allowExamples: true });

describe("entity extraction grader", () => {
  it("reads the example rows, and refuses them as labelled data", () => {
    expect(examples).toHaveLength(3);
    expect(() => parseDataset(readFileSync(EXAMPLE_PATH, "utf8"), { allowExamples: false })).toThrow(/example rows/);
  });

  it("scores set F1 ignoring case, order, legal suffixes and '&' versus 'and'", () => {
    const [plumber, dentist, empty] = examples;
    expect(gradeCase(plumber, ["sample rooter and drain", "Example Pipe Co"]).f1).toBe(1);
    expect(gradeCase(dentist, ["Placeholder Family Dental", "Yelp"])).toMatchObject({
      f1: 0.5,
      missed: ["Demo Smiles"],
      extra: ["Yelp"],
    });
    expect(gradeCase(empty, []).f1).toBe(1);
    expect(gradeCase(empty, ["Google Maps"]).f1).toBe(0);
  });

  it("keeps API errors out of F1 and counts them separately", () => {
    const [plumber, dentist] = examples;
    const result = score([gradeCase(plumber, ["Example Pipe Co."]), apiErrorCase(dentist, "anthropic returned 529")]);
    expect(result).toMatchObject({ total: 2, scored: 1, apiErrors: 1, precision: 1, recall: 0.5 });
    expect(result.meanF1).toBeCloseTo(2 / 3);
  });

  it("validates dataset.v1.jsonl when a person has added it", () => {
    const dataset = loadDataset();
    if (dataset === null) return;
    expect(dataset.length).toBeGreaterThanOrEqual(50);
    expect(new Set(dataset.map((c) => c.id)).size).toBe(dataset.length);
  });
});
