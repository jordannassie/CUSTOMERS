// Adds the missing tags to restaurant and coffee shop templates in question_library: a template that names a
// cuisine, product or service ("best sushi", "wine list", "cold brew") must name it in its tags, or onboarding's fit
// filter cannot tell which businesses it is for. Lists what it would change; APPLY=1 writes it. Tags are only added,
// never removed, and template text is never touched. Local stack or customers-dev only, never the live database:
//   npm run question-library:tag                                   (local stack, .env.test.local)
//   SEED_ENV_FILE=.env APPLY=1 npm run question-library:tag        (the dev .env database)
import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { createClient } from "@supabase/supabase-js";
import { it } from "vitest";
import { missingTermTags } from "@/modules/question-library";
import type { Database } from "@/types/database.types";

const LIVE_REF = "wsxusvapciexemfvtadm";
const DEV_REF = "whjdcjoojylajtyjywhx";
const ENV_FILE = process.env.SEED_ENV_FILE || ".env.test.local";
const APPLY = process.env.APPLY === "1";
const INDUSTRIES = ["restaurant", "coffee_shop"];

it(`tag cuisine and service templates (${APPLY ? "apply" : "dry run"})`, async () => {
  const env = parseEnv(readFileSync(ENV_FILE, "utf8"));
  const url = env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const host = URL.canParse(url) ? new URL(url).hostname : "";
  const isLocal = host === "127.0.0.1" || host === "localhost";
  if (url.includes(LIVE_REF) || !(isLocal || host === `${DEV_REF}.supabase.co`)) {
    throw new Error(`Refusing to change ${url || "(no URL)"}: only the local stack or customers-dev (${DEV_REF}).`);
  }
  if (!env.SUPABASE_SERVICE_ROLE_KEY) throw new Error(`SUPABASE_SERVICE_ROLE_KEY is missing from ${ENV_FILE}`);
  const db = createClient<Database>(url, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

  const { data, error } = await db.from("question_library").select("id, industry, template, tags, version, active").in("industry", INDUSTRIES);
  if (error) throw new Error(`Could not read question_library: ${error.message}`);
  const rows = data ?? [];
  const changes = rows.flatMap((r) => {
    const missing = missingTermTags(r.template, r.tags);
    return missing.length ? [{ ...r, add: missing }] : [];
  });

  console.log(`${host}: ${rows.length} restaurant and coffee shop templates, ${changes.length} need tags.`);
  for (const c of changes) console.log(`- [${c.industry} v${c.version}${c.active ? "" : ", inactive"}] "${c.template}": add ${c.add.join(", ")} to [${c.tags.join(", ")}]`);
  if (!APPLY || changes.length === 0) return;

  for (const c of changes) {
    const { error: updateError } = await db.from("question_library").update({ tags: [...c.tags, ...c.add] }).eq("id", c.id);
    if (updateError) throw new Error(`Could not tag "${c.template}": ${updateError.message}`);
  }
  console.log(`Tagged ${changes.length} templates.`);
});
