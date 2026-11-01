// Fails when a migration creates a table without enabling row level security on it in the same file (B-10), or, from
// migration 091 on, creates a function without revoking it from public, anon and authenticated in the same file
// (SEC-11: every function in public stays service-role only).
// Usage: node scripts/check-migration-rls.ts [file.sql ...]   (default: every file in supabase/migrations)

import { readdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";

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

// Files before 091 are skipped: a few old trigger functions were never revoked there, and 091 closes them all.
const FUNCTIONS_SINCE = 91;
const CREATE_FUNCTION = new RegExp(String.raw`\bcreate\s+(?:or\s+replace\s+)?(?:function|procedure)\s+${QUALIFIED}\s*\(`, "gi");
const REVOKE_FUNCTION = /\brevoke\s+(?:all|execute)(?:\s+privileges)?\s+on\s+(?:function|routine|procedure)s?\s+([\s\S]*?)\bfrom\s+([^;]+);/gi;

function functionsMissingRevoke(sql: string): string[] {
  const clean = stripComments(sql);
  const created = new Set([...clean.matchAll(CREATE_FUNCTION)].map((m) => tableKey(m[1], m[2])));
  for (const m of clean.matchAll(REVOKE_FUNCTION)) {
    const from = m[2].toLowerCase();
    if (!/\bpublic\b/.test(from) || !/\banon\b/.test(from) || !/\bauthenticated\b/.test(from)) continue;
    for (const f of m[1].matchAll(new RegExp(String.raw`${QUALIFIED}\s*\(`, "gi"))) created.delete(tableKey(f[1], f[2]));
  }
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
  if (Number(basename(file).split("_")[0]) < FUNCTIONS_SINCE) continue;
  for (const fn of functionsMissingRevoke(readFileSync(file, "utf8"))) {
    failed++;
    console.log(`FAIL ${file}: creates function ${fn} without "revoke all on function ${fn}(...) from public, anon, authenticated"`);
  }
}
console.log(
  failed
    ? `${failed} table(s) without RLS or function(s) left open`
    : `ok   ${files.length} migration file(s), every new table enables RLS and every new function is closed`,
);
process.exit(failed ? 1 : 0);
