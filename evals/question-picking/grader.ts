// Code grader for question picking (MVP_SPEC 25): the share of picked templates that a person marked
// acceptable for the business. Labels come from people, never from a model.
import { existsSync, readFileSync } from "node:fs";
import { z } from "zod";
import { LIBRARY_INDUSTRIES } from "@/lib/industries";
import { overlap } from "../shared/metrics";

export const DATASET_PATH = new URL("./dataset.v1.jsonl", import.meta.url);
export const EXAMPLE_PATH = new URL("./dataset.v1.jsonl.example", import.meta.url);
/** The reviewed library the picker chooses from (B-32). */
export const LIBRARY_PATH = new URL("../../supabase/seed/question-library.v1.json", import.meta.url);

export const PASS_OVERLAP = 0.8;

const caseSchema = z.object({
  id: z.string().min(1),
  // Only library industries: written questions (industry "other") have no pool to overlap with.
  input: z.object({
    industry: z.enum(LIBRARY_INDUSTRIES),
    services: z.array(z.string()),
    description: z.string(),
    city: z.string().min(1),
    region: z.string().nullable(),
  }),
  // Templates copied exactly from the library, still with {city}; at least 12 so a perfect pick exists.
  acceptable: z.array(z.string().min(1)).min(12),
  libraryVersion: z.number().int().min(1),
  labelledBy: z.string().min(1),
  labelledAt: z.iso.date(),
  note: z.string().optional(),
  // Only rows in dataset.v1.jsonl.example carry this; the real dataset must not.
  example: z.literal(true).optional(),
});

export type PickingCase = z.infer<typeof caseSchema>;

export function parseDataset(text: string, opts: { allowExamples: boolean }): PickingCase[] {
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
export function loadDataset(path: URL = DATASET_PATH): PickingCase[] | null {
  if (!existsSync(path)) return null;
  return parseDataset(readFileSync(path, "utf8"), { allowExamples: false });
}

const key = (t: string) => t.trim().toLowerCase();

/** Pool entries that are not in the library the picker sees: a typo, or a label for another version. */
export function poolNotInLibrary(c: PickingCase, libraryTemplates: string[]): string[] {
  const library = new Set(libraryTemplates.map(key));
  return c.acceptable.filter((t) => !library.has(key(t)));
}

export type GradedCase = {
  id: string;
  input: PickingCase["input"];
  acceptable: string[];
  /** Library templates the picker chose; written or fallback questions have none and count as misses. */
  picked: string[];
  source: string | null;
  overlap: number | null;
  missing: string[];
  apiError: string | null;
};

export function gradeCase(c: PickingCase, picked: string[], source: string): GradedCase {
  const pool = new Set(c.acceptable.map(key));
  return {
    id: c.id,
    input: c.input,
    acceptable: c.acceptable,
    picked,
    source,
    overlap: overlap(picked, c.acceptable),
    missing: picked.filter((t) => !pool.has(key(t))),
    apiError: null,
  };
}

export function apiErrorCase(c: PickingCase, message: string): GradedCase {
  return { id: c.id, input: c.input, acceptable: c.acceptable, picked: [], source: null, overlap: null, missing: [], apiError: message };
}

/** Mean overlap over the scored cases; API errors are counted apart and left out (principle 9). */
export function score(graded: GradedCase[]) {
  const scored = graded.filter((g) => g.overlap !== null);
  const mean = scored.length ? scored.reduce((sum, g) => sum + (g.overlap ?? 0), 0) / scored.length : 0;
  return {
    total: graded.length,
    scored: scored.length,
    apiErrors: graded.length - scored.length,
    fallbacks: scored.filter((g) => g.source === "fallback").length,
    meanOverlap: mean,
    passLevel: PASS_OVERLAP,
    passed: scored.length > 0 && mean >= PASS_OVERLAP,
  };
}
