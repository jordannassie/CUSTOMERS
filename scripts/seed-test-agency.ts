// Seeds a test agency (B-31, D-61): is_test, credits, and the 2 businesses with competitors and questions in
// tests/fixtures/test-agency.json. Its scans use recorded answers, so they cost no AI money.
// Local stack or customers-dev only, never the live database:
//   npm run seed:test-agency                          (local stack, .env.test.local from npm test)
//   npm run seed:test-agency -- --env .env.local      (customers-dev)
// Running it again reports the existing agency instead of creating a second one.
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { createClient } from "@supabase/supabase-js";

type Seed = {
  ownerEmail: string;
  agencyName: string;
  credits: number;
  businesses: {
    name: string;
    industry: string;
    domain: string;
    city: string;
    region: string;
    country: string;
    competitors: { name: string; domain: string }[];
    questions: string[];
  }[];
};

const LIVE_REF = "wsxusvapciexemfvtadm";
const DEV_REF = "whjdcjoojylajtyjywhx";

const envArg = process.argv.indexOf("--env");
const envFile = envArg > -1 ? process.argv[envArg + 1] : ".env.test.local";
const env = parseEnv(readFileSync(envFile, "utf8"));
const url = env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY ?? "";

const host = URL.canParse(url) ? new URL(url).hostname : "";
const isLocal = host === "127.0.0.1" || host === "localhost";
if (url.includes(LIVE_REF) || !(isLocal || host === `${DEV_REF}.supabase.co`)) {
  console.error(`Refusing to seed ${url || "(no URL)"}: only the local stack or customers-dev (${DEV_REF}).`);
  process.exit(1);
}
if (!serviceKey) throw new Error(`SUPABASE_SERVICE_ROLE_KEY is missing from ${envFile}`);

const seed: Seed = JSON.parse(readFileSync("tests/fixtures/test-agency.json", "utf8"));
const db = createClient(url, serviceKey, { auth: { persistSession: false } });

function must<T>(what: string, result: { data: T; error: { message: string } | null }): NonNullable<T> {
  if (result.error || result.data == null) throw new Error(`Could not ${what}: ${result.error?.message ?? "not found"}`);
  return result.data;
}

const listed = await db.auth.admin.listUsers({ perPage: 1000 });
if (listed.error) throw new Error(`Could not list users: ${listed.error.message}`);
const users = listed.data.users;
const existing = users.find((u) => u.email === seed.ownerEmail);
if (existing) {
  const agency = must("load the agency", await db.from("agencies").select("id, is_test").eq("owner_user_id", existing.id).single());
  console.log(`Already seeded: ${seed.ownerEmail}, agency ${agency.id} (is_test ${agency.is_test}).`);
  process.exit(0);
}

const password = randomBytes(12).toString("base64url");
const created = await db.auth.admin.createUser({ email: seed.ownerEmail, password, email_confirm: true });
if (created.error || !created.data.user) throw new Error(`Could not create the owner: ${created.error?.message}`);
const user = created.data.user;
const agency = must(
  "create the agency",
  await db.from("agencies").insert({ owner_user_id: user.id, name: seed.agencyName, is_test: true, status: "active" }).select("id").single(),
);
must(
  "grant credits",
  await db.rpc("grant_credits", {
    p_agency_id: agency.id,
    p_source: "admin",
    p_source_id: `seed-test-agency-${agency.id}`,
    p_amount: seed.credits,
    p_expires_at: null,
  }),
);

for (const b of seed.businesses) {
  const business = must(
    `create ${b.name}`,
    await db
      .from("businesses")
      .insert({
        owner_user_id: user.id,
        agency_id: agency.id,
        name: b.name,
        industry: b.industry,
        domain: b.domain,
        primary_city: b.city,
        primary_region: b.region,
        primary_country: b.country,
        models: ["openai", "anthropic", "perplexity"],
      })
      .select("id")
      .single(),
  );
  must(
    `add questions for ${b.name}`,
    await db.from("tracked_prompts").insert(b.questions.map((prompt) => ({ business_id: business.id, prompt }))).select("id"),
  );
  must(
    `add competitors for ${b.name}`,
    await db.from("business_competitors").insert(b.competitors.map((c) => ({ business_id: business.id, ...c, city: b.city }))).select("id"),
  );
  console.log(`${b.name} (${b.city}, ${b.region}): ${business.id}, ${b.questions.length} questions, ${b.competitors.length} competitors`);
}

console.log(`Seeded test agency ${agency.id} with ${seed.credits} credits.`);
console.log(`Log in as ${seed.ownerEmail} with password ${password}`);
