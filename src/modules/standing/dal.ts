import "server-only";
// Reads what the scans already saved, for "why you are ahead or behind". Nothing here starts a scan, asks an AI, reads
// a website or calls Google: it only reads visibility_results, the questions, the competitors and the site facts.
// Callers check the user may see this agency first.
import { cache } from "react";
import { createServiceClient } from "@/lib/supabase/service";
import { yourWebsite } from "@/lib/your-website";
import { SCORE_WINDOW_DAYS, splitByQuestion } from "@/modules/scanning";
import { toCheck, type StandingCheck } from "./checks";

const PAGE = 1000;
const DAY_MS = 86_400_000;

export type StandingData = {
  /** Answers that count in the score, for the business's AI tools, over the last 30 days. */
  checks: StandingCheck[];
  /** Answers to the user's own active questions, kept apart as the score does (scores/counted.ts). */
  ownChecks: StandingCheck[];
  /** Active question id to its wording now. */
  questions: Map<string, string>;
  you: { name: string; domain: string | null; websiteBlocked: boolean };
  competitors: { id: string; name: string; domain: string | null }[];
};

const must = <T>(what: string, r: { data: T | null; error: { message: string } | null }): T => {
  if (r.error) throw new Error(`Standing: could not load ${what}: ${r.error.message}`);
  return r.data as T;
};

async function readRows(businessId: string, since: Date) {
  const rows = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await createServiceClient()
      // The rows that count: no sample answers once the agency is real (migration 044).
      .from("visibility_results_counted")
      .select("id, provider, tracked_prompt_id, business_mentioned, competitors_mentioned, extracted_names, cited_sources, created_at")
      .eq("business_id", businessId)
      .gt("created_at", since.toISOString())
      .order("created_at")
      .order("id")
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`Standing: could not read answers: ${error.message}`);
    rows.push(...data);
    if (data.length < PAGE) break;
  }
  return rows;
}

// One read per server request, shared by every section of a page (React cache, keyed by the request's "now").
const load = cache(async (agencyId: string, businessId: string, nowMs: number): Promise<StandingData | null> => {
  const db = createServiceClient();
  const [business, competitors, questions, site] = await Promise.all([
    db.from("businesses").select("name, domain, models").eq("id", businessId).eq("agency_id", agencyId).maybeSingle(),
    db.from("business_competitors").select("id, name, domain").eq("business_id", businessId).order("created_at"),
    db.from("tracked_prompts").select("id, prompt, source, active, inactive_since").eq("business_id", businessId),
    db.from("business_site_facts").select("data").eq("business_id", businessId).maybeSingle(),
  ]);
  const b = must("the business", business);
  if (!b) return null;
  const models = new Set((b.models as string[] | null) ?? []);
  const rows = await readRows(businessId, new Date(nowMs - SCORE_WINDOW_DAYS * DAY_MS));
  // View columns are typed nullable, but provider is not null in the table.
  const checks = rows.filter((r) => models.has(r.provider!)).map((r) => toCheck({ ...r, provider: r.provider! }));
  const tracked = must("questions", questions)!.map((q) => ({ id: q.id, source: q.source, active: q.active, inactiveSince: q.inactive_since, prompt: q.prompt }));
  const { scored, own } = splitByQuestion(checks, tracked);
  const website = yourWebsite(must("site facts", site)?.data ?? null);
  return {
    checks: scored,
    ownChecks: own,
    questions: new Map(tracked.filter((q) => q.active).map((q) => [q.id, q.prompt])),
    you: { name: b.name, domain: b.domain, websiteBlocked: website?.readStatus === "blocked" },
    competitors: must("competitors", competitors)!.map((c) => ({ id: c.id, name: c.name, domain: c.domain })),
  };
});

/** Saved answers and facts for one business; null when it is not the agency's. */
export function loadStanding(agencyId: string, businessId: string, now: Date): Promise<StandingData | null> {
  return load(agencyId, businessId, now.getTime());
}
