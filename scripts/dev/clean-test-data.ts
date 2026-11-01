// LOCAL ONLY (2026-10-15): tidies test data the e2e runs, evals and seed scripts leave in the local database.
//   npm run dev:clean-test-data              # dry run: lists what it would change, changes nothing
//   npm run dev:clean-test-data -- --apply   # makes the changes
// 1. Test businesses with no active questions (agency is_test, or an owner at @example.test): removed, with their
//    questions, results and jobs (the foreign keys cascade). One still on a Stripe plan is listed but kept: delete it
//    from Settings so its plan item ends too.
// 2. Trial grants whose expiry is not the agency's trial end (MVP_SPEC 4.4: a trial grant expires at trial end).
//    A grant that ends too early on a running trial is moved with extend_trial_grant, as the admin "Extend trial"
//    does. One that runs past an ended or shortened trial gets the trial end, then expire_grants() sweeps it.
//    No credit function shortens a grant, so that one is a direct update, allowed only here and only locally.
// The database comes from .env.local, else .env; anything but a local Supabase URL is refused.
import { existsSync, readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { parseEnv } from "node:util";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type Agency = { id: string; name: string; isTest: boolean; ownerEmail: string | null; status: string; trialEndsAt: string | null };
export type Business = { id: string; agencyId: string; name: string; activeQuestions: number; onPlan: boolean };
export type TrialGrant = { id: string; agencyId: string; remaining: number; expiresAt: string | null };

export type BusinessFix = { id: string; name: string; agency: string; action: "remove" | "keep_on_plan" };
export type GrantFix = {
  id: string;
  agencyId: string;
  agency: string;
  expiresAt: string;
  trialEndsAt: string;
  /** "trial_over": it ended early, but so has the trial, so there is nothing to give back. */
  action: "extend" | "shorten" | "nothing_left" | "trial_over";
};

const TEST_EMAIL = /@example\.test$/i;
// Expiry and trial end are written a few seconds apart in one checkout, so a small gap is the same moment.
const SAME_MOMENT_MS = 5 * 60 * 1000;

export function isTestAgency(agency: Agency): boolean {
  return agency.isTest || TEST_EMAIL.test(agency.ownerEmail ?? "");
}

/** Test businesses with no active questions: removed, unless still on a Stripe plan. */
export function emptyTestBusinesses(agencies: Agency[], businesses: Business[]): BusinessFix[] {
  const byId = new Map(agencies.map((a) => [a.id, a]));
  return businesses.flatMap((b) => {
    const agency = byId.get(b.agencyId);
    if (!agency || !isTestAgency(agency) || b.activeQuestions > 0) return [];
    return [{ id: b.id, name: b.name, agency: agency.name, action: b.onPlan ? ("keep_on_plan" as const) : ("remove" as const) }];
  });
}

/** Trial grants whose expiry is not the trial end, and what to do about each. */
export function trialGrantFixes(agencies: Agency[], grants: TrialGrant[]): GrantFix[] {
  const byId = new Map(agencies.map((a) => [a.id, a]));
  return grants.flatMap((g) => {
    const agency = byId.get(g.agencyId);
    if (!agency?.trialEndsAt || !g.expiresAt) return [];
    const gap = new Date(g.expiresAt).getTime() - new Date(agency.trialEndsAt).getTime();
    if (Math.abs(gap) < SAME_MOMENT_MS) return [];
    const action = g.remaining <= 0 ? "nothing_left" : gap > 0 ? "shorten" : agency.status === "trialing" ? "extend" : "trial_over";
    return [{ id: g.id, agencyId: g.agencyId, agency: agency.name, expiresAt: g.expiresAt, trialEndsAt: agency.trialEndsAt, action }];
  });
}

/** Only a Supabase on this machine. */
export function isLocalUrl(url: string): boolean {
  if (!URL.canParse(url)) return false;
  const host = new URL(url).hostname;
  return host === "127.0.0.1" || host === "localhost";
}

function must<T>(what: string, result: { data: T | null; error: { message: string } | null }): T {
  if (result.error || result.data === null) throw new Error(`Could not ${what}: ${result.error?.message ?? "no data"}`);
  return result.data;
}

async function ownerEmails(db: SupabaseClient): Promise<Map<string, string>> {
  const emails = new Map<string, string>();
  for (let page = 1; ; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(`Could not list users: ${error.message}`);
    for (const u of data.users) if (u.email) emails.set(u.id, u.email);
    if (data.users.length < 1000) return emails;
  }
}

async function load(db: SupabaseClient) {
  const [emails, agencies, businesses, questions, plans, grants] = await Promise.all([
    ownerEmails(db),
    db.from("agencies").select("id, name, is_test, owner_user_id, status, trial_ends_at"),
    db.from("businesses").select("id, agency_id, name").is("deleted_at", null),
    db.from("tracked_prompts").select("business_id").eq("active", true),
    db.from("business_subscriptions").select("business_id").neq("status", "canceled"),
    db.from("credit_grants").select("id, agency_id, remaining, expires_at").eq("source", "trial"),
  ]);
  const active = new Map<string, number>();
  for (const q of must("load questions", questions)) active.set(q.business_id, (active.get(q.business_id) ?? 0) + 1);
  const onPlan = new Set(must("load plans", plans).map((p) => p.business_id));
  return {
    agencies: must("load agencies", agencies).map((a) => ({
      id: a.id,
      name: a.name,
      isTest: a.is_test,
      ownerEmail: emails.get(a.owner_user_id) ?? null,
      status: a.status,
      trialEndsAt: a.trial_ends_at,
    })),
    businesses: must("load businesses", businesses).map((b) => ({
      id: b.id,
      agencyId: b.agency_id,
      name: b.name,
      activeQuestions: active.get(b.id) ?? 0,
      onPlan: onPlan.has(b.id),
    })),
    grants: must("load trial grants", grants).map((g) => ({ id: g.id, agencyId: g.agency_id, remaining: g.remaining, expiresAt: g.expires_at })),
  };
}

const day = (iso: string) => iso.slice(0, 16).replace("T", " ");

async function main() {
  const apply = process.argv.includes("--apply");
  const envFile = existsSync(".env.local") ? ".env.local" : ".env";
  const env = parseEnv(readFileSync(envFile, "utf8"));
  const url = env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  if (!isLocalUrl(url)) {
    console.error(`Refusing: ${envFile} points at ${url || "(no URL)"}, not a local Supabase.`);
    process.exit(1);
  }
  if (!env.SUPABASE_SERVICE_ROLE_KEY) throw new Error(`SUPABASE_SERVICE_ROLE_KEY is missing from ${envFile}`);
  const db = createClient(url, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

  const data = await load(db);
  const businesses = emptyTestBusinesses(data.agencies, data.businesses);
  const grants = trialGrantFixes(data.agencies, data.grants);
  const remove = businesses.filter((b) => b.action === "remove");
  const kept = businesses.filter((b) => b.action === "keep_on_plan");

  console.log(`${apply ? "Cleaning" : "Dry run (add --apply to change anything)"}: ${url}\n`);
  console.log(`Test businesses with no active questions: ${remove.length} to remove, ${kept.length} kept (still on a plan)`);
  for (const b of businesses) console.log(`  ${b.action === "remove" ? "remove" : "keep  "}  ${b.agency} / ${b.name}  (${b.id})`);
  console.log(`\nTrial grants whose expiry is not the trial end: ${grants.length}`);
  for (const g of grants) console.log(`  ${g.action.padEnd(12)} ${g.agency}: expires ${day(g.expiresAt)}, trial ends ${day(g.trialEndsAt)}  (${g.id})`);
  if (!apply) return;

  for (const b of remove) {
    const { error } = await db.from("businesses").delete().eq("id", b.id);
    if (error) console.error(`  could not remove ${b.name}: ${error.message}`);
  }
  let shortened = 0;
  for (const g of grants) {
    if (g.action === "extend") {
      const { error } = await db.rpc("extend_trial_grant", { p_agency_id: g.agencyId, p_expires_at: g.trialEndsAt });
      if (error) console.error(`  could not extend ${g.agency}: ${error.message}`);
    } else if (g.action === "shorten") {
      const { error } = await db.from("credit_grants").update({ expires_at: g.trialEndsAt }).eq("id", g.id).eq("source", "trial");
      if (error) console.error(`  could not shorten ${g.agency}: ${error.message}`);
      else shortened++;
    }
  }
  // Grants now past their trial end are taken out of the balance with a ledger row, as the nightly job does.
  if (shortened > 0) {
    const { data: expired, error } = await db.rpc("expire_grants");
    if (error) console.error(`  expire_grants failed: ${error.message}`);
    else console.log(`\nexpire_grants swept ${expired} grant(s).`);
  }
  console.log("\nDone.");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
