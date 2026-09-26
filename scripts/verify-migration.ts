// Checks the existing-data move (B-14, MVP_SPEC 19 step 3): counts match, every business has an agency,
// and a signed-in user can read only their own rows.
// Usage:
//   node scripts/verify-migration.ts <target> --baseline --save before.json   (old table counts, before the move)
//   node scripts/verify-migration.ts <target> --compare before.json [--save after.json]
// <target> is passed to `supabase db query`: --local | --linked | --db-url <url>, plus --workdir <dir> if needed.

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const LEGACY_TABLES = [
  "profiles",
  "businesses",
  "business_competitors",
  "tracked_prompts",
  "visibility_runs",
  "visibility_results",
  "visibility_scores",
  "billing_accounts",
  "business_billing_items",
  "subscriptions",
];

const MODELS = "array['openai', 'anthropic', 'perplexity']";

// Users the move gives an agency (025_backfill_existing_data.sql).
const MOVED_OWNERS = `(
  select owner_user_id as id from public.businesses
  union
  select user_id from public.billing_accounts
)`;

const LEGACY_COUNTS = LEGACY_TABLES.map((t) => `'${t}', (select count(*) from public.${t})`).join(",\n    ");

const AFTER_SQL = `select json_build_object(
  'legacy', json_build_object(
    ${LEGACY_COUNTS}
  ),
  'agencies', (select count(*) from public.agencies),
  'test_agencies', (select count(*) from public.agencies where is_test),
  'owners_without_agency', (select count(*) from ${MOVED_OWNERS} o
    join auth.users u on u.id = o.id
    where not exists (select 1 from public.agencies a where a.owner_user_id = o.id)),
  'businesses_without_agency', (select count(*) from public.businesses where agency_id is null),
  'businesses_wrong_agency', (select count(*) from public.businesses b
    join public.agencies a on a.id = b.agency_id where a.owner_user_id <> b.owner_user_id),
  'questions_legacy', (select count(*) from public.tracked_prompts where source = 'legacy'),
  'questions_without_source', (select count(*) from public.tracked_prompts where source is null),
  'checks', (select count(*) from public.visibility_results),
  'checks_unmapped', (select count(*) from public.visibility_results r
    left join public.tracked_prompts q on q.id = r.tracked_prompt_id
    left join public.businesses b on b.id = r.business_id
    where not (r.provider = any(${MODELS})) or q.business_id is distinct from r.business_id or b.agency_id is null),
  'moved_agencies_with_stripe', (select count(*) from public.agencies a
    where a.owner_user_id in ${MOVED_OWNERS} and (a.stripe_customer_id is not null or a.stripe_subscription_id is not null)),
  'moved_agencies_with_credits', (select count(distinct g.agency_id) from public.credit_grants g
    join public.agencies a on a.id = g.agency_id where a.owner_user_id in ${MOVED_OWNERS})
)`;

// One statement (supabase db query runs one at a time): signs in as each agency owner and as a visitor
// through RLS, and raises if anyone sees a row that is not theirs or misses one that is.
const RLS_SQL = `do $$
declare
  o record;
  seen record;
  failures text := '';
begin
  for o in select a.owner_user_id as id from public.agencies a loop
    perform set_config('request.jwt.claims', json_build_object('sub', o.id, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select
      (select count(*) from public.agencies where owner_user_id <> o.id) as other_agencies,
      (select count(*) from public.businesses where owner_user_id <> o.id) as other_businesses,
      (select count(*) from public.tracked_prompts q join public.businesses b on b.id = q.business_id
        where b.owner_user_id <> o.id) as other_questions,
      (select count(*) from public.visibility_results r join public.businesses b on b.id = r.business_id
        where b.owner_user_id <> o.id) as other_checks,
      (select count(*) from public.businesses) as own_businesses
    into seen;
    reset role;
    if seen.other_agencies + seen.other_businesses + seen.other_questions + seen.other_checks > 0
      or seen.own_businesses <> (select count(*) from public.businesses where owner_user_id = o.id) then
      failures := failures || format(' owner %s sees %s', o.id, row_to_json(seen));
    end if;
  end loop;

  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  set local role anon;
  select (select count(*) from public.agencies) + (select count(*) from public.businesses)
    + (select count(*) from public.tracked_prompts) + (select count(*) from public.visibility_results) as n
  into seen;
  reset role;
  if seen.n > 0 then failures := failures || format(' visitor sees %s rows', seen.n); end if;

  if failures <> '' then raise exception 'RLS isolation failed:%', failures; end if;
end $$`;

function parseArgs(argv: string[]) {
  const target: string[] = [];
  let save: string | undefined;
  let compare: string | undefined;
  let baseline = false;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--save") save = argv[++i];
    else if (arg === "--compare") compare = argv[++i];
    else if (arg === "--baseline") baseline = true;
    else if (arg === "--db-url" || arg === "--workdir") target.push(arg, argv[++i]);
    else target.push(arg);
  }
  if (!target.some((a) => ["--local", "--linked", "--db-url"].includes(a))) {
    throw new Error("Pass a target: --local, --linked or --db-url <url> (and --workdir <dir> if needed).");
  }
  return { target, save, compare, baseline };
}

function query(target: string[], sql: string): Record<string, unknown>[] {
  const out = execFileSync("supabase", ["db", "query", ...target, "-o", "json", sql], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  const start = out.indexOf("{");
  return start === -1 ? [] : JSON.parse(out.slice(start)).rows;
}

function firstValue(rows: Record<string, unknown>[]) {
  return Object.values(rows[0])[0] as Record<string, unknown>;
}

const { target, save, compare, baseline } = parseArgs(process.argv.slice(2));
let failed = false;
const check = (ok: boolean, label: string) => {
  console.log(`${ok ? "ok  " : "FAIL"}  ${label}`);
  if (!ok) failed = true;
};

if (baseline) {
  const legacy = firstValue(query(target, `select json_build_object(${LEGACY_COUNTS})`));
  console.table(legacy);
  if (save) writeFileSync(save, JSON.stringify({ legacy }, null, 2) + "\n");
  process.exit(0);
}

const result = firstValue(query(target, AFTER_SQL));
const { legacy, ...moved } = result as { legacy: Record<string, number> } & Record<string, number>;

if (compare) {
  const before = JSON.parse(readFileSync(compare, "utf8")).legacy as Record<string, number>;
  console.log("Old tables, before and after:");
  console.table(Object.fromEntries(LEGACY_TABLES.map((t) => [t, { before: before[t], after: legacy[t] }])));
  for (const t of LEGACY_TABLES) check(before[t] === legacy[t], `${t} count unchanged (${legacy[t]})`);
}

console.log("Moved data:");
console.table(moved);
check(moved.owners_without_agency === 0, "every user with a business or billing account has an agency");
check(moved.businesses_without_agency === 0, "every business has an agency");
check(moved.businesses_wrong_agency === 0, "every business sits in its owner's agency");
check(moved.questions_without_source === 0, "every question has a source");
check(moved.checks_unmapped === 0, "every past result maps to a check (model, question, agency)");
check(moved.moved_agencies_with_stripe === 0, "no Stripe data carried over");

try {
  query(target, RLS_SQL);
  check(true, `RLS isolation holds for all ${moved.agencies} agency owners and for visitors`);
} catch (error) {
  const stderr = (error as { stderr?: string }).stderr ?? String(error);
  check(false, stderr.trim().split("\n").find((l) => l.includes("RLS")) ?? stderr.trim());
}

if (save) writeFileSync(save, JSON.stringify(result, null, 2) + "\n");
process.exit(failed ? 1 : 0);
