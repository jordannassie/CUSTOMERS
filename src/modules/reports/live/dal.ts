import "server-only";
// The live report: worked out on read from the same loads as the Overview, Competitors and Questions pages, so every
// number matches them. Saved answers and saved fixes only: no Google values (D-73), no AI call, no scan.
// Callers check the viewer may see this business first (the signed-in owner, or a live share link).
import { createServiceClient } from "@/lib/supabase/service";
import { loadCompetitorsPage, loadPicked, whySentence, type LeaderRow } from "@/modules/competitors";
import { loadOverview } from "@/modules/overview";
import { loadQuestionTrends, SCORE_WINDOW_DAYS } from "@/modules/scanning";
import { competitorWhy, loadStanding, type StandingData } from "@/modules/standing";
import { buildDocument } from "../build";
import type { ReportDocument } from "../document";
import { PLAN_STATUSES } from "../facts";

// The report never shows Google values, so the competitor table's Google lookups are skipped altogether.
const noSignals = async () => null;

/** The top likely reason for each competitor row, from saved answers: why they lead, or where you lead. */
function reasonsFor(rows: LeaderRow[], data: StandingData): Map<string, string> {
  const base = { checks: data.checks, questions: data.questions, you: data.you };
  const out = new Map<string, string>();
  for (const row of rows) {
    if (row.isYou || row.score === null || !row.standing) continue;
    const domain = data.competitors.find((c) => c.name === row.name)?.domain ?? null;
    const why = competitorWhy({ ...base, competitor: { name: row.name, domain, label: row.chain?.brand } });
    const fact = row.standing === "ahead" ? why.youLead[0] : why.reasons[0];
    if (fact) out.set(row.name, fact.title);
  }
  return out;
}

/** Null when the business is not the agency's or has been deleted. */
export async function loadLiveDocument(agencyId: string, businessId: string, now: Date): Promise<ReportDocument | null> {
  const db = createServiceClient();
  const { data: business, error } = await db
    .from("businesses")
    .select("name, domain, primary_city, primary_region, status")
    .eq("id", businessId)
    .eq("agency_id", agencyId)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw new Error(`Reports: could not read the business: ${error.message}`);
  if (!business) return null;

  const [overview, competitors, standing, trends, picked, fixes] = await Promise.all([
    loadOverview(agencyId, businessId, now),
    loadCompetitorsPage(agencyId, businessId, now, noSignals),
    loadStanding(agencyId, businessId, now),
    loadQuestionTrends(agencyId, businessId, now),
    // The same likely reason the Overview shows, from saved answers only.
    loadPicked(agencyId, businessId, now),
    db
      .from("opportunities")
      .select("title, impact, status, category, claude_prompt, where_to_apply, evidence, description, affected_url, created_at")
      .eq("business_id", businessId)
      .in("status", PLAN_STATUSES),
  ]);
  if (fixes.error) throw new Error(`Reports: could not read fixes: ${fixes.error.message}`);
  if (!overview || !competitors || !standing) return null;

  return buildDocument({
    business: {
      name: business.name,
      domain: business.domain,
      place: [business.primary_city, business.primary_region].filter(Boolean).join(", ") || null,
      paused: business.status === "paused",
    },
    now,
    windowDays: SCORE_WINDOW_DAYS,
    overview,
    competitors,
    checks: standing.checks,
    questions: (trends?.rows ?? []).map((r) => ({ id: r.id, prompt: r.prompt, cells: r.cells })),
    reasons: reasonsFor(competitors.leaderboard, standing),
    reason: picked && typeof picked === "object" ? whySentence(picked.why) : null,
    fixes: fixes.data,
  });
}
