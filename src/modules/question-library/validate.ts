// Engineering checks for B-32: every template has {city}, at least one tag and one intent, and an
// approved file records who reviewed it and when. Pure, so tests and scripts share it.
import { LIBRARY_INDUSTRIES } from "@/lib/industries";
import { CITY, libraryFileSchema, type LibraryFile } from "./schema";

export type ValidationResult =
  | { ok: true; file: LibraryFile; warnings: string[] }
  | { ok: false; errors: string[]; warnings: string[] };

// About 40 per industry (D-62); fewer after review is fine, but a big gap means an industry was missed.
const MIN_PER_INDUSTRY = 20;
const MAX_PER_INDUSTRY = 60;

export function validateLibrary(raw: unknown): ValidationResult {
  const parsed = libraryFileSchema.safeParse(raw);
  if (!parsed.success) {
    const errors = parsed.error.issues.map((i) => `${i.path.join(".") || "(file)"}: ${i.message}`);
    return { ok: false, errors, warnings: [] };
  }
  const file = parsed.data;
  const errors: string[] = [];
  const warnings: string[] = [];

  if (file.status === "approved" && !file.review) {
    errors.push("status is approved but review (reviewer and reviewedAt) is missing");
  }

  const seen = new Set<string>();
  file.templates.forEach((t, i) => {
    const at = `templates.${i} (${t.industry}: "${t.template}")`;
    if (t.industry === "other") errors.push(`${at}: "other" has no library`);
    if (!t.template.includes(CITY)) errors.push(`${at}: missing ${CITY}`);
    const otherPlaceholders = (t.template.match(/\{[^}]*\}/g) ?? []).filter((p) => p !== CITY);
    if (otherPlaceholders.length) errors.push(`${at}: unknown placeholder ${otherPlaceholders.join(", ")}`);
    if (!t.template.trim().endsWith("?")) errors.push(`${at}: not a question (must end with "?")`);
    if (!t.tags.some((tag) => tag.trim())) errors.push(`${at}: needs at least one tag`);
    if (t.tags.some((tag) => !tag.trim())) errors.push(`${at}: empty tag`);
    const key = `${t.industry}|${t.template.trim().toLowerCase()}`;
    if (seen.has(key)) errors.push(`${at}: duplicate template`);
    seen.add(key);
  });

  if (file.status !== "example") {
    for (const industry of LIBRARY_INDUSTRIES) {
      const count = file.templates.filter((t) => t.industry === industry).length;
      if (count < MIN_PER_INDUSTRY || count > MAX_PER_INDUSTRY) {
        warnings.push(`${industry}: ${count} templates (expected about 40)`);
      }
    }
  }

  return errors.length ? { ok: false, errors, warnings } : { ok: true, file, warnings };
}
