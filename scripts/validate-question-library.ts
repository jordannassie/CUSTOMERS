// Checks a question library file (B-32 engineering checks): every template has {city}, at least one
// tag and one intent, and an approved file records its reviewer and date.
//   npm run question-library:validate
//   QUESTION_LIBRARY_FILE=path/to/file.json npm run question-library:validate
import { existsSync, readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { validateLibrary } from "@/modules/question-library";

const FILE = process.env.QUESTION_LIBRARY_FILE || "supabase/seed/question-library.v1.json";

it(`validate ${FILE}`, () => {
  if (!existsSync(FILE)) throw new Error(`${FILE} does not exist yet; draft it with npm run question-library:generate`);
  const raw = JSON.parse(readFileSync(FILE, "utf8"));
  const result = validateLibrary(raw);
  for (const w of result.warnings) console.warn(`warning: ${w}`);
  if (result.ok) {
    const { file } = result;
    const review = file.review ? `reviewed by ${file.review.reviewer} on ${file.review.reviewedAt}` : "not reviewed";
    console.log(`${file.templates.length} templates, version ${file.version}, status ${file.status}, ${review}`);
  }
  expect(result.ok ? [] : result.errors).toEqual([]);
});
