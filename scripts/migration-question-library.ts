// B-32 step 4 for live: writes supabase/migrations/NNN_question_library_v<version>.sql from the APPROVED library file,
// so the library reaches live with the other migrations (the seed script refuses the live database on purpose).
// Refuses a draft or unreviewed file. Run it once, after approval; commit the migration with the approved file.
//   npm run question-library:migration
//   MIGRATION_NUMBER=097 npm run question-library:migration    (pick the number yourself)
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { expect, it } from "vitest";
import { libraryMigrationSql, nextMigrationNumber } from "./lib/question-library-migration";

const FILE = process.env.QUESTION_LIBRARY_FILE || "supabase/seed/question-library.v1.json";
const DIR = "supabase/migrations";

it(`write the question library migration from ${FILE}`, () => {
  const raw = JSON.parse(readFileSync(FILE, "utf8"));
  const files = readdirSync(DIR);
  const existing = files.find((f) => new RegExp(`^\\d{3}_question_library_v${raw.version}\\.sql$`).test(f));
  if (existing) throw new Error(`${DIR}/${existing} already exists; edit the library and regenerate it instead of adding a second one`);
  const number = process.env.MIGRATION_NUMBER || nextMigrationNumber(files);
  const path = `${DIR}/${number}_question_library_v${raw.version}.sql`;
  if (existsSync(path)) throw new Error(`${path} already exists`);
  writeFileSync(path, libraryMigrationSql(raw, number, FILE));
  console.log(`Wrote ${path}. Add it to the "Pending for live" list in supabase/migrations/README.md.`);
  expect(existsSync(path)).toBe(true);
});
