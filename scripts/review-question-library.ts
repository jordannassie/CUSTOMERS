// B-32 step 3, review aid: writes the library as a spreadsheet (one row per template, with automatic flags to check
// first) and prints templates per industry and intent. Open the CSV in Google Sheets or Excel, set "action" on every
// row (keep, edit, delete; add new rows with action "add"), then run npm run question-library:import-review.
//   npm run question-library:review
//   QUESTION_LIBRARY_FILE=path/to/file.json REVIEW_CSV=path/to/review.csv npm run question-library:review
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { expect, it } from "vitest";
import { libraryFileSchema } from "@/modules/question-library";
import { toCsv } from "./lib/csv";
import { REVIEW_COLUMNS, reviewRows, summary, type ReviewTemplate } from "./lib/question-library-review";

const FILE = process.env.QUESTION_LIBRARY_FILE || "supabase/seed/question-library.v1.json";
// evals/results is git-ignored: the sheet is a working file, not part of the repo.
const OUT = process.env.REVIEW_CSV || "evals/results/question-library/review.csv";

it(`write the review sheet for ${FILE}`, () => {
  const raw = JSON.parse(readFileSync(FILE, "utf8"));
  libraryFileSchema.parse(raw);
  const templates = raw.templates as ReviewTemplate[];
  const rows = reviewRows(templates);
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, toCsv(REVIEW_COLUMNS, rows));

  const flagged = rows.filter((r) => r.flags);
  const byFlag = new Map<string, number>();
  for (const r of flagged) {
    for (const f of r.flags.split("; ")) {
      const kind = f.startsWith("near duplicate") ? "near duplicate" : f.startsWith("added by hand") ? "added by hand" : f;
      byFlag.set(kind, (byFlag.get(kind) ?? 0) + 1);
    }
  }
  console.log(`${rows.length} templates, ${flagged.length} with flags. Sheet: ${OUT}`);
  for (const [flag, count] of [...byFlag].sort((a, b) => b[1] - a[1])) console.log(`  ${count}  ${flag}`);
  console.log("Per industry (best / urgent / price / reviews / comparison):");
  for (const s of summary(templates)) {
    const intents = Object.values(s.byIntent).join(" / ");
    const thin = s.thinIntents.length ? `  thin: ${s.thinIntents.join(", ")}` : "";
    console.log(`  ${s.industry.padEnd(12)} ${String(s.templates).padStart(3)}  ${intents}${thin}`);
  }
  console.log(`Status stays "${raw.status}". Approving is a separate step: see docs/launch/OWNER-TODO.md (B-32).`);
  expect(rows.length).toBe(templates.length);
});
