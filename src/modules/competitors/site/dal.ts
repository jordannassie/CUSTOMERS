import "server-only";
// "Check their website" (B-91, D-85): a competitor's site is read once and kept, for every business that tracks it
// (website_facts, migration 071). Before reading, a check claims the row (insert only), so two clicks at once, in two
// tabs or from the panel and the Opportunities card, never read the same site twice. A read that fails frees the claim.
// Only an address the user typed or the AI answers cited is read. Nothing from Google is read or kept (D-73).
import { env } from "@/lib/env";
import { hostOf } from "@/lib/site-type";
import { createServiceClient } from "@/lib/supabase/service";
import { readCompetitorWebsite } from "@/modules/onboarding/server";
import { checkRateLimit } from "@/modules/rate-limit";
import { loadStanding } from "@/modules/standing";
import { allowedDomain, canTakeOver, READING, siteState, type SavedSite, type SiteState } from "./service";

type Db = ReturnType<typeof createServiceClient>;

async function loadStates(db: Db, domains: string[]): Promise<Map<string, SiteState & { fetchedAt: string }>> {
  const unique = [...new Set(domains)];
  if (unique.length === 0) return new Map();
  const { data, error } = await db.from("website_facts").select("domain, data, fetched_at").in("domain", unique);
  if (error) throw new Error(`Competitor websites: could not load: ${error.message}`);
  return new Map(data.map((r) => [r.domain, { ...siteState(r), fetchedAt: r.fetched_at }] as const));
}

/** Finished reads for these domains, and the ones a check is reading right now. */
export async function loadSavedSites(domains: string[]): Promise<{ done: Map<string, SavedSite>; reading: Set<string> }> {
  const states = await loadStates(createServiceClient(), domains);
  const done = new Map<string, SavedSite>();
  const reading = new Set<string>();
  for (const [domain, s] of states) {
    if (s.kind === "done") done.set(domain, s.site);
    if (s.kind === "reading") reading.add(domain);
  }
  return { done, reading };
}

/** True when this check now owns the domain's row: a new row, or one left by a check that never finished. */
async function claim(db: Db, domain: string, at: string, existing: (SiteState & { fetchedAt: string }) | undefined, now: Date): Promise<boolean> {
  if (!existing) {
    const { data, error } = await db
      .from("website_facts")
      .upsert({ domain, data: READING, fetched_at: at }, { onConflict: "domain", ignoreDuplicates: true })
      .select("domain");
    if (error) throw new Error(`Competitor websites: could not claim: ${error.message}`);
    return data.length === 1;
  }
  if (!canTakeOver(existing, now)) return false;
  // Only if nobody took it over first: the row must still be the one we looked at.
  const { data, error } = await db
    .from("website_facts")
    .update({ data: READING, fetched_at: at })
    .eq("domain", domain)
    .eq("fetched_at", existing.fetchedAt)
    .select("domain");
  if (error) throw new Error(`Competitor websites: could not claim: ${error.message}`);
  return data.length === 1;
}

export type CheckResult =
  | { ok: true; status: SavedSite["status"] | "reading"; reused: boolean }
  | { ok: false; status: 400 | 403 | 404 | 429 | 502 | 503; error: string };

/** Callers check the user may edit this agency first. */
export async function checkWebsite(
  user: { id: string },
  agency: { id: string; isTest: boolean },
  input: { businessId: string; competitorId: string; domain: string },
  now = new Date(),
): Promise<CheckResult> {
  // Fixture mode is refused in production, as for auto-fill (onboarding/dal.ts).
  const fixtures = env.ONBOARDING_FIXTURES === "true" && env.NODE_ENV !== "production";
  const db = createServiceClient();
  const [competitor, standing, business] = await Promise.all([
    db
      .from("business_competitors")
      .select("id, domain, businesses!inner(agency_id)")
      .eq("id", input.competitorId)
      .eq("business_id", input.businessId)
      .eq("businesses.agency_id", agency.id)
      .maybeSingle(),
    loadStanding(agency.id, input.businessId, now),
    db.from("businesses").select("domain").eq("id", input.businessId).eq("agency_id", agency.id).maybeSingle(),
  ]);
  if (competitor.error) throw new Error(`Competitor websites: could not load the competitor: ${competitor.error.message}`);
  if (!competitor.data || !standing) return { ok: false, status: 404, error: "That competitor was removed. Reload the page." };

  const cited = new Set([...standing.checks, ...standing.ownChecks].flatMap((c) => c.sites));
  const domain = allowedDomain(input.domain, competitor.data.domain, cited);
  if (!domain) return { ok: false, status: 400, error: "Add their website first." };
  // Your own site is read once too, the same way, so both sides are compared on the same checks.
  const own = business.data?.domain ? hostOf(business.data.domain) : null;
  const states = await loadStates(db, [domain, ...(own ? [own] : [])]);
  const theirs = states.get(domain);
  // Already read: never again, from any button.
  if (theirs?.kind === "done") return { ok: true, status: theirs.site.status, reused: true };
  if (theirs && !canTakeOver(theirs, now)) return { ok: true, status: "reading", reused: true };

  // Test accounts never spend real reads (D-61); fixture mode has made-up sites to read instead.
  if (agency.isTest && !fixtures) return { ok: false, status: 403, error: "Website checks are off for test accounts." };
  const limit = await checkRateLimit("site_check", user.id);
  if (limit === "limited") return { ok: false, status: 429, error: "You've checked a lot of websites this hour. Try again later." };
  if (limit === "unavailable") return { ok: false, status: 503, error: "We couldn't check right now. Try again in a few minutes." };

  const at = now.toISOString();
  if (!(await claim(db, domain, at, theirs, now))) return { ok: true, status: "reading", reused: true };
  const ownState = own && own !== domain ? states.get(own) : undefined;
  const readOwn = !!own && own !== domain && ownState?.kind !== "done" && (await claim(db, own, at, ownState, now));

  const usage = { accountUserId: user.id, businessId: input.businessId };
  const [their, mine] = await Promise.all([
    readCompetitorWebsite(domain, usage),
    readOwn ? readCompetitorWebsite(own!, usage) : Promise.resolve(null),
  ]);
  await Promise.all([finish(db, domain, at, their), ...(readOwn ? [finish(db, own!, at, mine)] : [])]);
  if (!their) return { ok: false, status: 502, error: "We couldn't read that website right now. Try again later." };
  return { ok: true, status: their.status, reused: false };
}

/** Saves the read over our claim, or frees the claim when the read failed, so it can be tried again. */
async function finish(db: Db, domain: string, at: string, facts: unknown): Promise<void> {
  const mine = db.from("website_facts");
  const { error } = facts
    ? await mine.update({ data: facts as never, fetched_at: at }).eq("domain", domain).eq("fetched_at", at)
    : await mine.delete().eq("domain", domain).eq("fetched_at", at).contains("data", READING);
  if (error) throw new Error(`Competitor websites: could not save: ${error.message}`);
}
