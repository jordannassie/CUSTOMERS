import "server-only";
// The "See why" panels for every tracked competitor, from answers the scans already saved and the saved fixes. No scan,
// AI call or Google call happens here; Google lines are added by the page from the values it already fetched (D-73).
// Callers check the user may see this agency first.
import { createServiceClient } from "@/lib/supabase/service";
import { competitorWhy, loadStanding } from "@/modules/standing";
import { fixesAbout, openWhere, type WhyPanel } from "./service";

const OPEN_STATUSES = ["open", "in_progress"];

/** `chains`: tracked name to the chain AI named instead (from the leaderboard), so a branch's panel says "Bennu Coffee". */
export async function loadWhyPanels(agencyId: string, businessId: string, now: Date, chains: Map<string, string> = new Map()): Promise<WhyPanel[]> {
  const [data, fixes] = await Promise.all([
    loadStanding(agencyId, businessId, now),
    createServiceClient()
      .from("opportunities")
      .select("id, title, description, evidence, recommended_action, affected_url, category, claude_prompt")
      .eq("business_id", businessId)
      .in("status", OPEN_STATUSES)
      .order("created_at", { ascending: false }),
  ]);
  if (fixes.error) throw new Error(`Competitors: could not load fixes: ${fixes.error.message}`);
  if (!data) return [];
  // The "get found by AI" checklist ticks are stored as fixes too; they are about the business, not a competitor.
  const rows = fixes.data.filter((r) => !r.affected_url?.startsWith("checklist:"));
  // The Opportunities groups that have fixes to do, so "Fix on ..." links only where there is something to open.
  const openFixes = openWhere(rows);
  return data.competitors.map((c) => {
    const label = chains.get(c.name);
    return {
      competitorId: c.id,
      trackedName: c.name,
      openFixes,
      why: competitorWhy({ checks: data.checks, questions: data.questions, you: data.you, competitor: { ...c, label } }),
      fixes: fixesAbout(rows, { id: c.id, name: c.name, also: label }),
    };
  });
}
