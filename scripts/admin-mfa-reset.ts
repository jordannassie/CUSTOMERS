// Removes an admin's authenticator app (TOTP) factors so they can set up a new one at /admin-verify, for an admin who
// lost their phone (ADMIN_REQUIRE_MFA, preview audit 2026-11-13). Only for emails listed in that project's ADMIN_EMAILS.
// A dry run lists the factors; --apply removes them. The admin then signs in with their password and scans a new code.
//   npm run admin:mfa-reset -- --env .env.production.local --email someone@example.com            (dry run)
//   npm run admin:mfa-reset -- --env .env.production.local --email someone@example.com --apply    (removes them)
// The env file needs NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and ADMIN_EMAILS; it is never printed.
import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { createClient } from "@supabase/supabase-js";

function arg(name: string): string | undefined {
  const at = process.argv.indexOf(name);
  return at > -1 ? process.argv[at + 1] : undefined;
}

const envFile = arg("--env");
const email = arg("--email")?.trim().toLowerCase();
const apply = process.argv.includes("--apply");
if (!envFile || !email) {
  console.error("Usage: npm run admin:mfa-reset -- --env <env file> --email <admin email> [--apply]");
  process.exit(1);
}

const env = parseEnv(readFileSync(envFile, "utf8"));
const url = env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY ?? "";
if (!url || !serviceKey) throw new Error(`NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing from ${envFile}`);

const admins = (env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
if (!admins.includes(email)) {
  console.error(`Refusing: ${email} is not in ADMIN_EMAILS of ${envFile}. This script only resets admins.`);
  process.exit(1);
}

const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

async function findUserId(target: string): Promise<string | null> {
  for (let page = 1; ; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(`Could not list users: ${error.message}`);
    const hit = data.users.find((u) => u.email?.toLowerCase() === target);
    if (hit) return hit.id;
    if (data.users.length < 1000) return null;
  }
}

const userId = await findUserId(email);
if (!userId) {
  console.error(`No user with the email ${email} in ${new URL(url).hostname}.`);
  process.exit(1);
}

const { data, error } = await db.auth.admin.mfa.listFactors({ userId });
if (error) throw new Error(`Could not list factors: ${error.message}`);
const factors = data.factors;
console.log(`${email} has ${factors.length} factor(s) in ${new URL(url).hostname}:`);
for (const f of factors) console.log(`  ${f.factor_type} ${f.status} "${f.friendly_name ?? ""}" created ${f.created_at}`);

if (!apply) {
  console.log(factors.length ? "Dry run. Add --apply to remove them." : "Nothing to remove.");
  process.exit(0);
}
for (const f of factors) {
  const { error: deleteError } = await db.auth.admin.mfa.deleteFactor({ id: f.id, userId });
  if (deleteError) throw new Error(`Could not remove factor ${f.id}: ${deleteError.message}`);
}
console.log(`Removed ${factors.length} factor(s). ${email} sets up a new authenticator app at /admin-verify after signing in.`);
