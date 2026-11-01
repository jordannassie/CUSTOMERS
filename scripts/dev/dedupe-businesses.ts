// LOCAL ONLY (2026-10-16): removes copies of one business inside one agency, which migration 067 now refuses.
//   npm run dev:dedupe-businesses              # dry run: lists what it would change, changes nothing
//   npm run dev:dedupe-businesses -- --apply   # makes the changes
// (Node before 23.6 needs NODE_OPTIONS=--experimental-strip-types, as for dev:clean-test-data.)
// Within one agency, live businesses with the same website (unless the kept one is a chain, whose branches share it),
// the same Google listing, or more than one setup draft are copies. The oldest of each group stays. A newer copy is
// soft-deleted with soft_delete_business (restorable for 30 days), unless it has scans or is on a Stripe plan: those
// are listed and kept, for a person to look at.
// The database comes from .env.local, else .env; anything but a local Supabase URL is refused.
import { existsSync, readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { parseEnv } from "node:util";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type Business = {
  id: string;
  agencyId: string;
  name: string;
  domain: string | null;
  placesId: string | null;
  status: string;
  /** Set by the setup wizard on every draft it makes; seeds and test helpers leave it empty. */
  onboardingStep: number | null;
  isChain: boolean;
  createdAt: string;
  hasScans: boolean;
  onPlan: boolean;
};

export type DuplicateFix = {
  id: string;
  name: string;
  agencyId: string;
  /** The business it copies, which stays. */
  keptId: string;
  why: "website" | "listing" | "draft";
  action: "remove" | "keep_has_scans" | "keep_on_plan";
};

const WAIT_DAYS = 30;

/** Only a Supabase on this machine (as clean-test-data.ts; node runs this file directly, so no shared import). */
export function isLocalUrl(url: string): boolean {
  if (!URL.canParse(url)) return false;
  const host = new URL(url).hostname;
  return host === "127.0.0.1" || host === "localhost";
}

/** The copies to remove (or keep, with the reason), oldest first in each group. Pure. */
export function duplicateFixes(businesses: Business[]): DuplicateFix[] {
  const oldestFirst = [...businesses].sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
  const removed = new Set<string>();
  const fixes: DuplicateFix[] = [];
  const rules: { why: DuplicateFix["why"]; key: (b: Business) => string | null }[] = [
    { why: "website", key: (b) => (b.domain ? b.domain.trim().toLowerCase() : null) },
    { why: "listing", key: (b) => b.placesId },
    // A wizard draft, as migration 067 counts them.
    { why: "draft", key: (b) => (b.status === "onboarding" && b.onboardingStep !== null ? "draft" : null) },
  ];
  for (const rule of rules) {
    const groups = new Map<string, Business[]>();
    for (const b of oldestFirst) {
      const k = rule.key(b);
      if (k === null || removed.has(b.id)) continue;
      const id = `${b.agencyId}|${k}`;
      groups.set(id, [...(groups.get(id) ?? []), b]);
    }
    for (const [kept, ...copies] of groups.values()) {
      // A chain's branches share one website and differ by their Google listing.
      if (rule.why === "website" && kept.isChain) continue;
      for (const c of copies) {
        if (fixes.some((f) => f.id === c.id)) continue;
        const action = c.onPlan ? "keep_on_plan" : c.hasScans ? "keep_has_scans" : "remove";
        fixes.push({ id: c.id, name: c.name, agencyId: c.agencyId, keptId: kept.id, why: rule.why, action });
        if (action === "remove") removed.add(c.id);
      }
    }
  }
  return fixes;
}

function must<T>(what: string, result: { data: T | null; error: { message: string } | null }): T {
  if (result.error || result.data === null) throw new Error(`Could not ${what}: ${result.error?.message ?? "no data"}`);
  return result.data;
}

async function load(db: SupabaseClient): Promise<Business[]> {
  const [businesses, runs, plans] = await Promise.all([
    db.from("businesses").select("id, agency_id, name, domain, places_id, status, onboarding_step, is_chain, created_at").is("deleted_at", null).not("agency_id", "is", null),
    db.from("visibility_runs").select("business_id"),
    db.from("business_subscriptions").select("business_id").neq("status", "canceled"),
  ]);
  const scanned = new Set(must("load scans", runs).map((r) => r.business_id as string));
  const onPlan = new Set(must("load plans", plans).map((p) => p.business_id as string));
  return must("load businesses", businesses).map((b) => ({
    id: b.id,
    agencyId: b.agency_id,
    name: b.name,
    domain: b.domain,
    placesId: b.places_id,
    status: b.status,
    onboardingStep: b.onboarding_step,
    isChain: b.is_chain,
    createdAt: b.created_at,
    hasScans: scanned.has(b.id),
    onPlan: onPlan.has(b.id),
  }));
}

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

  const fixes = duplicateFixes(await load(db));
  const remove = fixes.filter((f) => f.action === "remove");
  console.log(`${apply ? "Removing copies" : "Dry run (add --apply to change anything)"}: ${url}\n`);
  console.log(`Copies of a business in the same agency: ${remove.length} to remove, ${fixes.length - remove.length} kept`);
  for (const f of fixes) console.log(`  ${f.action.padEnd(14)} ${f.name} (${f.id}): same ${f.why} as ${f.keptId}`);
  if (!apply) return;

  const purgeAfter = new Date(Date.now() + WAIT_DAYS * 86_400_000).toISOString();
  for (const f of remove) {
    const { error } = await db.rpc("soft_delete_business", { p_agency_id: f.agencyId, p_business_id: f.id, p_purge_after: purgeAfter });
    if (error) console.error(`  could not remove ${f.name}: ${error.message}`);
  }
  console.log("\nDone.");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
