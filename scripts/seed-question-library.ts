// Loads the approved question library into question_library (B-32 step 4). Refuses a draft or example
// file, a file without a reviewer and date, and a version that is already loaded.
// Local stack or customers-dev only, never the live database:
//   npm run question-library:seed                                  (local stack, .env.test.local from npm test)
//   SEED_ENV_FILE=.env.local npm run question-library:seed         (customers-dev)
import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { createClient } from "@supabase/supabase-js";
import { expect, it } from "vitest";
import { toSeedRows } from "@/modules/question-library";
import type { Database } from "@/types/database.types";

const LIVE_REF = "wsxusvapciexemfvtadm";
const DEV_REF = "whjdcjoojylajtyjywhx";
const FILE = process.env.QUESTION_LIBRARY_FILE || "supabase/seed/question-library.v1.json";
const ENV_FILE = process.env.SEED_ENV_FILE || ".env.test.local";

it(`load ${FILE}`, async () => {
  const rows = toSeedRows(JSON.parse(readFileSync(FILE, "utf8")));

  const env = parseEnv(readFileSync(ENV_FILE, "utf8"));
  const url = env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const host = URL.canParse(url) ? new URL(url).hostname : "";
  const isLocal = host === "127.0.0.1" || host === "localhost";
  if (url.includes(LIVE_REF) || !(isLocal || host === `${DEV_REF}.supabase.co`)) {
    throw new Error(`Refusing to seed ${url || "(no URL)"}: only the local stack or customers-dev (${DEV_REF}).`);
  }
  if (!env.SUPABASE_SERVICE_ROLE_KEY) throw new Error(`SUPABASE_SERVICE_ROLE_KEY is missing from ${ENV_FILE}`);
  const db = createClient<Database>(url, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

  const version = rows[0]?.version ?? 1;
  const loaded = await db.from("question_library").select("id", { count: "exact", head: true }).eq("version", version);
  if (loaded.error) throw new Error(`Could not read question_library: ${loaded.error.message}`);
  if (loaded.count) {
    console.log(`Version ${version} is already loaded (${loaded.count} rows); nothing to do.`);
    return;
  }

  const inserted = await db.from("question_library").insert(rows);
  expect(inserted.error).toBeNull();
  console.log(`Loaded ${rows.length} templates as version ${version} into ${host}.`);
});
