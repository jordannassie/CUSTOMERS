// Fails when a migration creates a table without enabling row level security on it in the same file (B-10).
// Usage: node scripts/check-migration-rls.ts [file.sql ...]   (default: every file in supabase/migrations)

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const DIR = "supabase/migrations";

function stripComments(sql: string) {
  return sql.replace(/\/\*[\s\S]*?\*\//g, "").replace(/--[^\n]*/g, "");
}

function tableKey(schema: string | undefined, name: string) {
  return `${(schema ?? "public").replace(/"/g, "").toLowerCase()}.${name.replace(/"/g, "").toLowerCase()}`;
}

const IDENT = String.raw`("[^"]+"|[a-z_][a-z0-9_$]*)`;
const QUALIFIED = String.raw`(?:${IDENT}\s*\.\s*)?${IDENT}`;
const CREATE = new RegExp(String.raw`\bcreate\s+(?:unlogged\s+)?table\s+(?:if\s+not\s+exists\s+)?${QUALIFIED}`, "gi");
const ENABLE = new RegExp(
  String.raw`\balter\s+table\s+(?:if\s+exists\s+)?(?:only\s+)?${QUALIFIED}\s+enable\s+row\s+level\s+security`,
  "gi",
);

function tablesMissingRls(sql: string): string[] {
  const clean = stripComments(sql);
  const created = new Set([...clean.matchAll(CREATE)].map((m) => tableKey(m[1], m[2])));
  for (const m of clean.matchAll(ENABLE)) created.delete(tableKey(m[1], m[2]));
  return [...created];
}

const files = process.argv.slice(2).length
  ? process.argv.slice(2)
  : readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort().map((f) => join(DIR, f));

let failed = 0;
for (const file of files) {
  for (const table of tablesMissingRls(readFileSync(file, "utf8"))) {
    failed++;
    console.log(`FAIL ${file}: creates ${table} without "alter table ${table} enable row level security"`);
  }
}
console.log(failed ? `${failed} table(s) without RLS` : `ok   ${files.length} migration file(s), every new table enables RLS`);
process.exit(failed ? 1 : 0);
