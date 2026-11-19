// Per-field accuracy for auto-fill (2026-10-15): name, industry, city, phone found, and at least 3 real services.
// A smaller set than dataset.v1.jsonl, labelled only from each business's own website (D-73: no Google content in
// the repo). Labels are checked by a person before a result is trusted (principle 6). Pure, so the fast suite tests it.
import { existsSync, readFileSync } from "node:fs";
import { z } from "zod";
import { INDUSTRIES } from "@/modules/onboarding/industries";
import type { BusinessDetails } from "@/modules/onboarding/schema";

export const FIELDS_PATH = new URL("./fields.v1.jsonl", import.meta.url);
export const FIELDS = ["name", "industry", "city", "phone", "services"] as const;
export type Field = (typeof FIELDS)[number];

const fieldsCase = z.object({
  id: z.string().min(1),
  input: z.object({ domain: z.string().min(1) }),
  blocksScanners: z.boolean(),
  expected: z.object({
    name: z.string().min(1),
    industry: z.enum([...INDUSTRIES]),
    city: z.string(),
    phonePresent: z.boolean(),
    services: z.array(z.string()),
  }),
  labelledBy: z.string().min(1),
  labelledAt: z.iso.date(),
  note: z.string().optional(),
});
export type FieldsCase = z.infer<typeof fieldsCase>;

export function parseFields(text: string): FieldsCase[] {
  return text
    .split("\n")
    .filter((line) => line.trim())
    .map((line, i) => {
      const parsed = fieldsCase.safeParse(JSON.parse(line));
      if (!parsed.success) throw new Error(`fields.v1.jsonl line ${i + 1}: ${parsed.error.message}`);
      return parsed.data;
    });
}

export function loadFields(path: URL = FIELDS_PATH): FieldsCase[] | null {
  return existsSync(path) ? parseFields(readFileSync(path, "utf8")) : null;
}

// "&" is "and"; a legal suffix (Inc., LLC, PLLC, Ltd.) is not part of the name customers use.
const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(inc|llc|pllc|ltd|co|corp)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
const STOP = new Set(["and", "the", "for", "of", "a", "an", "in", "with", "your", "our", "services", "service"]);
const words = (s: string) => norm(s).split(" ").filter((w) => w.length > 2 && !STOP.has(w));

/**
 * The name counts when it is the label or holds it with little more ("Perfect Med Spa NYC"), never a page title
 * ("Wilshire Smile Studio - Los Angeles Dentist, Cosmetic..." is wrong: the form should start on the brand).
 */
export function nameOk(expected: string, predicted: string): boolean {
  const e = norm(expected);
  const p = norm(predicted);
  if (!p) return false;
  if (p === e) return true;
  if (/\s[-|–—]\s/.test(predicted)) return false;
  return (p.includes(e) || e.includes(p)) && Math.abs(p.length - e.length) <= 12;
}

/** Each predicted service shares a real word with one the site names; at least 3 do. */
export function servicesOk(expected: string[], predicted: string[]): boolean {
  const known = new Set(expected.flatMap(words));
  const real = predicted.filter((s) => words(s).some((w) => known.has(w) || [...known].some((k) => k.startsWith(w) || w.startsWith(k))));
  return real.length >= Math.min(3, expected.length);
}

export type FieldsGraded = { id: string; apiError: string | null; ok: Record<Field, boolean> | null; predicted: Partial<BusinessDetails> | null };

export function gradeFields(c: FieldsCase, predicted: BusinessDetails): FieldsGraded {
  const e = c.expected;
  return {
    id: c.id,
    apiError: null,
    predicted: { name: predicted.name, industry: predicted.industry, industryText: predicted.industryText, city: predicted.city, phone: predicted.phone, services: predicted.services },
    ok: {
      name: nameOk(e.name, predicted.name),
      industry: predicted.industry === e.industry,
      city: e.city === "" ? true : norm(predicted.city) === norm(e.city) || norm(predicted.city).includes(norm(e.city)),
      phone: Boolean(predicted.phone.trim()) === e.phonePresent,
      services: servicesOk(e.services, predicted.services),
    },
  };
}

export function fieldsApiError(c: FieldsCase, error: string): FieldsGraded {
  return { id: c.id, apiError: error, ok: null, predicted: null };
}

/** Accuracy per field over the cases that ran; API errors are counted apart (principle 9). */
export function fieldAccuracy(graded: FieldsGraded[]) {
  const scored = graded.filter((g) => g.ok !== null);
  const perField = Object.fromEntries(
    FIELDS.map((f) => [f, scored.length ? scored.filter((g) => g.ok![f]).length / scored.length : 0]),
  ) as Record<Field, number>;
  return { total: graded.length, scored: scored.length, apiErrors: graded.length - scored.length, perField };
}
