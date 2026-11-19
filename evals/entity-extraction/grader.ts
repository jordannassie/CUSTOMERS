// Code grader for "Also recommended" extraction (MVP_SPEC 25, D-74). Labels come from people, never from a model.
import { existsSync, readFileSync } from "node:fs";
import { z } from "zod";
import { coreName } from "@/modules/scanning/mention-text";
import { setF1 } from "../shared/metrics";

export const DATASET_PATH = new URL("./dataset.v1.jsonl", import.meta.url);
export const EXAMPLE_PATH = new URL("./dataset.v1.jsonl.example", import.meta.url);

const caseSchema = z.object({
  id: z.string().min(1),
  model: z.enum(["gpt-4.1-mini", "claude-haiku-4-5", "sonar"]),
  question: z.string().min(1),
  city: z.string().min(1),
  answer: z.string().min(1),
  // The person's label: every business the answer names, in order of first appearance.
  names: z.array(z.string().min(1)),
  labelledBy: z.string().min(1),
  note: z.string().optional(),
  // Only rows in dataset.v1.jsonl.example carry this; the real dataset must not.
  example: z.literal(true).optional(),
});

export type ExtractionCase = z.infer<typeof caseSchema>;

export function parseDataset(text: string, opts: { allowExamples: boolean }): ExtractionCase[] {
  return text
    .split("\n")
    .filter((line) => line.trim())
    .map((line, i) => {
      const parsed = caseSchema.safeParse(JSON.parse(line));
      if (!parsed.success) throw new Error(`dataset line ${i + 1}: ${parsed.error.message}`);
      if (parsed.data.example && !opts.allowExamples) {
        throw new Error(`dataset line ${i + 1}: example rows are not labelled data; remove them`);
      }
      return parsed.data;
    });
}

/** Null until a person has labelled dataset.v1.jsonl; the suite then skips. */
export function loadDataset(path: URL = DATASET_PATH): ExtractionCase[] | null {
  if (!existsSync(path)) return null;
  return parseDataset(readFileSync(path, "utf8"), { allowExamples: false });
}

// Same rule the extractor uses to drop repeats: "Ace Plumbing, LLC" and "Ace Plumbing" are one business.
const key = (name: string) => coreName(name);

export type GradedCase = ExtractionCase & {
  predicted: string[] | null;
  f1: number | null;
  /** Set when the call failed for reasons outside the model (principle 9); the case is left out of F1. */
  apiError: string | null;
  missed: string[];
  extra: string[];
};

export function gradeCase(c: ExtractionCase, predicted: string[]): GradedCase {
  const want = new Set(c.names.map(key));
  const got = new Set(predicted.map(key));
  return {
    ...c,
    predicted,
    f1: setF1([...want], [...got]),
    apiError: null,
    missed: c.names.filter((n) => !got.has(key(n))),
    extra: predicted.filter((n) => !want.has(key(n))),
  };
}

export function apiErrorCase(c: ExtractionCase, error: string): GradedCase {
  return { ...c, predicted: null, f1: null, apiError: error, missed: [], extra: [] };
}

/** Mean set F1 per answer (the pass level), plus micro precision and recall over all names. */
export function score(graded: GradedCase[]) {
  const scored = graded.filter((g) => g.f1 !== null);
  let hits = 0;
  let predictedTotal = 0;
  let expectedTotal = 0;
  for (const g of scored) {
    const want = new Set(g.names.map(key));
    const got = new Set((g.predicted ?? []).map(key));
    hits += [...got].filter((n) => want.has(n)).length;
    predictedTotal += got.size;
    expectedTotal += want.size;
  }
  return {
    total: graded.length,
    scored: scored.length,
    apiErrors: graded.length - scored.length,
    meanF1: scored.length ? scored.reduce((sum, g) => sum + (g.f1 ?? 0), 0) / scored.length : 0,
    precision: predictedTotal ? hits / predictedTotal : 1,
    recall: expectedTotal ? hits / expectedTotal : 1,
  };
}
