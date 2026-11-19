// B-32 step 3, back from the review sheet: applies every row's action (keep, edit, delete, add) to the library file
// and checks it with the B-32 engineering checks. The file stays a draft; approving it is a separate, deliberate step
// (set "status": "approved" and "review": {"reviewer", "reviewedAt"} by hand, then npm run question-library:validate).
//   npm run question-library:import-review
//   QUESTION_LIBRARY_FILE=path/to/file.json REVIEW_CSV=path/to/review.csv npm run question-library:import-review
import { readFileSync, writeFileSync } from "node:fs";
import { expect, it } from "vitest";
import { libraryFileSchema, validateLibrary } from "@/modules/question-library";
import { parseCsv } from "./lib/csv";
import { applyReview, type ReviewTemplate } from "./lib/question-library-review";

const FILE = process.env.QUESTION_LIBRARY_FILE || "supabase/seed/question-library.v1.json";
const SHEET = process.env.REVIEW_CSV || "evals/results/question-library/review.csv";

it(`apply ${SHEET} to ${FILE}`, () => {
  const raw = JSON.parse(readFileSync(FILE, "utf8"));
  const file = { ...libraryFileSchema.parse(raw), templates: raw.templates as ReviewTemplate[] };
  if (file.status !== "draft") throw new Error(`${FILE} is "${file.status}"; reviews are applied to a draft only`);
  const next = applyReview(file, parseCsv(readFileSync(SHEET, "utf8")));

  const result = validateLibrary(next);
  for (const w of result.warnings) console.warn(`warning: ${w}`);
  if (!result.ok) {
    console.error("Not written: the reviewed library fails the B-32 checks:\n- " + result.errors.join("\n- "));
    expect(result.errors).toEqual([]);
    return;
  }
  // Same key order as the generator's file, so the diff shows only the template changes.
  writeFileSync(FILE, `${JSON.stringify({ ...raw, templates: next.templates }, null, 2)}\n`);
  const before = file.templates.length;
  console.log(`${FILE}: ${before} templates before, ${next.templates.length} after. Status is still draft.`);
});
