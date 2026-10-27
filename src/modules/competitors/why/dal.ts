import "server-only";
// The "See why" panels for every tracked competitor, from answers the scans already saved and the saved fixes. No scan,
// AI call or Google call happens here; Google lines are added by the page from the values it already fetched (D-73).
// Callers check the user may see this agency first.
import { cache } from "react";
import { requestNow } from "@/lib/request-now";
import { hostOf } from "@/lib/site-type";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAgency } from "@/modules/auth";
import { competitorWhy, loadStanding, type StandingData } from "@/modules/standing";
import { loadSavedSites } from "../site/dal";
import type { SavedSite } from "../site/service";
import { claimRows, compareRows, fixesAbout, openFixRefs, ownSite, serviceChips, withFixes, type WebsiteView, type WhyPanel } from "./service";

const OPEN_STATUSES = ["open", "in_progress"];

type FixRow = {
  id: string;
  title: string;
  description: string | null;
  evidence: string | null;
  recommended_action: string | null;
  affected_url: string | null;
  category: string | null;
  claude_prompt: string | null;
};

/** What the panels are built from: saved answers, open fixes and saved website reads, all read at once. */
export type WhyInputs = {
  data: StandingData;
  rows: FixRow[];
  saved: Map<string, SavedSite>;
  reading: Set<string>;
};

/**
 * The reads behind every panel, in one round: the saved answers and the open fixes together, then the website reads
 * for every site the answers cited or the user typed. Callers start it alongside their own reads (2026-10-27: the
 * pages used to wait for one before starting the other). Once per request (React cache).
 */
export const loadWhyInputs = cache(async (agencyId: string, businessId: string, nowMs: number): Promise<WhyInputs | null> => {
  const [data, fixes] = await Promise.all([
    loadStanding(agencyId, businessId, new Date(nowMs)),
    createServiceClient()
      .from("opportunities")
      .select("id, title, description, evidence, recommended_action, affected_url, category, claude_prompt")
      .eq("business_id", businessId)
      .in("status", OPEN_STATUSES)
      .order("created_at", { ascending: false }),
  ]);
  if (fixes.error) throw new Error(`Competitors: could not load fixes: ${fixes.error.message}`);
  if (!data) return null;
  const own = data.you.domain ? hostOf(data.you.domain) : null;
  const domains = new Set<string>([...data.checks, ...data.ownChecks].flatMap((c) => c.sites));
  for (const c of data.competitors) if (c.domain && hostOf(c.domain)) domains.add(hostOf(c.domain)!);
  if (own) domains.add(own);
  const { done, reading } = await loadSavedSites([...domains]);
  // The "get found by AI" checklist ticks are stored as fixes too; they are about the business, not a competitor.
  return { data, rows: fixes.data.filter((r) => !r.affected_url?.startsWith("checklist:")), saved: done, reading };
});

/** `chains`: tracked name to the chain AI named instead (from the leaderboard), so a branch's panel says "Bennu Coffee". */
export function buildWhyPanels({ data, rows, saved, reading }: WhyInputs, chains: Map<string, string> = new Map()): WhyPanel[] {
  // Each reason links to the one fix that deals with it, never just the first fix of its group.
  const fixRefs = openFixRefs(rows);
  const own = data.you.domain ? hostOf(data.you.domain) : null;
  // Your site as a check read it, the same way as theirs (step 1 and 2); else what setup read.
  const yourSite = ownSite(own ? saved.get(own) : undefined) ?? data.you.site;
  const base = { checks: data.checks, questions: data.questions, you: { ...data.you, site: yourSite } };
  return data.competitors.map((c) => {
    const label = chains.get(c.name);
    // Their website first (typed, or cited and matched by name), then what a check saved for it, if anyone ran one.
    const first = competitorWhy({ ...base, competitor: { ...c, label } });
    const site = first.site ? (saved.get(first.site) ?? null) : null;
    return {
      competitorId: c.id,
      trackedName: c.name,
      fixRefs,
      why: withFixes(site ? competitorWhy({ ...base, competitor: { ...c, label }, theirWebsite: site }) : first, fixRefs),
      fixes: fixesAbout(rows, { id: c.id, name: c.name, also: label }),
      website: {
        domain: first.site,
        status: site?.status ?? null,
        checkedAt: site?.fetchedAt ?? null,
        checked: !!site,
        checking: !site && !!first.site && reading.has(first.site),
        services: site ? serviceChips(site, yourSite, own ? (saved.get(own)?.services ?? []) : []) : [],
        claims: site ? claimRows(site, yourSite) : [],
        compare: site ? compareRows(site, yourSite) : null,
      },
    };
  });
}

export async function loadWhyPanels(agencyId: string, businessId: string, now: Date, chains: Map<string, string> = new Map()): Promise<WhyPanel[]> {
  const inputs = await loadWhyInputs(agencyId, businessId, now.getTime());
  return inputs ? buildWhyPanels(inputs, chains) : [];
}

/** "Check competitor websites" on Opportunities (B-91): each tracked competitor and where its website check stands. */
export async function getWebsiteChecks(businessId: string): Promise<{ competitorId: string; name: string; website: WebsiteView }[]> {
  const { agency } = await requireAgency({ next: "/opportunities" });
  const panels = await loadWhyPanels(agency.id, businessId, requestNow());
  return panels.map((p) => ({ competitorId: p.competitorId, name: p.trackedName, website: p.website }));
}
