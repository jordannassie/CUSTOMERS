// Code grader for business auto-fill (MVP_SPEC 25, D-18): a schema check and a "nothing invented"
// check. Labels come from people, never from a model.
import { existsSync, readFileSync } from "node:fs";
import { z } from "zod";
import { INDUSTRIES } from "@/modules/onboarding/industries";
import type { BusinessDetails } from "@/modules/onboarding/schema";

export const DATASET_PATH = new URL("./dataset.v1.jsonl", import.meta.url);
export const EXAMPLE_PATH = new URL("./dataset.v1.jsonl.example", import.meta.url);

export const TEXT_FIELDS = ["name", "industry", "description", "city", "state", "country", "phone", "address"] as const;
type TextField = (typeof TEXT_FIELDS)[number];

// The person's label: the true value, or "" when neither the website nor Google states it.
const labelSchema = z.object({
  name: z.string(),
  industry: z.enum([...INDUSTRIES, ""]),
  description: z.string(),
  services: z.array(z.string()),
  city: z.string(),
  state: z.string(),
  country: z.string(),
  phone: z.string(),
  address: z.string(),
});

const caseSchema = z.object({
  id: z.string().min(1),
  input: z.union([z.object({ domain: z.string().min(1) }), z.object({ name: z.string().min(1), city: z.string().min(1) })]),
  // Sites that block scanners (Cloudflare and similar) are tagged so their results can be read apart.
  blocksScanners: z.boolean(),
  expected: labelSchema,
  labelledBy: z.string().min(1),
  labelledAt: z.iso.date(),
  note: z.string().optional(),
  // Only rows in dataset.v1.jsonl.example carry this; the real dataset must not.
  example: z.literal(true).optional(),
});

export type AutofillCase = z.infer<typeof caseSchema>;

export function parseDataset(text: string, opts: { allowExamples: boolean }): AutofillCase[] {
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
export function loadDataset(path: URL = DATASET_PATH): AutofillCase[] | null {
  if (!existsSync(path)) return null;
  return parseDataset(readFileSync(path, "utf8"), { allowExamples: false });
}

// What the form may receive: the pass level is 100% of outputs matching this.
const detailsSchema = labelSchema.extend({ services: z.array(z.string().min(1)).max(12) }).strict();

export function schemaOk(details: unknown): boolean {
  return detailsSchema.safeParse(details).success;
}

const plain = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
const digits = (s: string) => s.replace(/\D/g, "");

function sameValue(field: TextField, want: string, got: string): boolean {
  if (field === "phone") return digits(want).endsWith(digits(got)) || digits(got).endsWith(digits(want));
  if (field === "description") return true;
  // Places adds ", USA" and similar; a label contained in the answer (or the reverse) counts.
  if (field === "address" || field === "name") return plain(got).includes(plain(want)) || plain(want).includes(plain(got));
  return plain(want) === plain(got);
}

export type GradedCase = AutofillCase & {
  predicted: BusinessDetails | null;
  schemaOk: boolean;
  /** Filled in although the label says no source states it. Any one fails the suite. */
  invented: string[];
  /** Filled with a value different from the label: reported, not a failure of this suite. */
  wrong: string[];
  /** Labelled but left empty: reported. */
  missed: string[];
  /** Set when a provider failed for reasons outside the model (principle 9); left out of the scores. */
  apiError: string | null;
};

export function gradeCase(c: AutofillCase, predicted: BusinessDetails): GradedCase {
  const invented: string[] = [];
  const wrong: string[] = [];
  const missed: string[] = [];
  for (const field of TEXT_FIELDS) {
    const want = c.expected[field].trim();
    const got = (predicted[field] ?? "").trim();
    if (got && !want) invented.push(field);
    else if (!got && want) missed.push(field);
    else if (got && want && !sameValue(field, want, got)) wrong.push(field);
  }
  if (predicted.services.length > 0 && c.expected.services.length === 0) invented.push("services");
  if (predicted.services.length === 0 && c.expected.services.length > 0) missed.push("services");
  return { ...c, predicted, schemaOk: schemaOk(predicted), invented, wrong, missed, apiError: null };
}

export function apiErrorCase(c: AutofillCase, error: string): GradedCase {
  return { ...c, predicted: null, schemaOk: false, invented: [], wrong: [], missed: [], apiError: error };
}

export function score(graded: GradedCase[]) {
  const scored = graded.filter((g) => g.apiError === null);
  return {
    total: graded.length,
    scored: scored.length,
    apiErrors: graded.length - scored.length,
    schemaRate: scored.length ? scored.filter((g) => g.schemaOk).length / scored.length : 0,
    inventedFields: scored.reduce((n, g) => n + g.invented.length, 0),
    casesWithInvented: scored.filter((g) => g.invented.length > 0).map((g) => g.id),
    wrongFields: scored.reduce((n, g) => n + g.wrong.length, 0),
    missedFields: scored.reduce((n, g) => n + g.missed.length, 0),
    blockedSites: scored.filter((g) => g.blocksScanners).length,
  };
}
