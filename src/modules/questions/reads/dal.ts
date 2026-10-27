import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import type { HistoryRow } from "../history";
import type { FixText } from "../skipped";

// Extra reads for the Questions page, with the service role. Callers check the business is the agency's first.

const PAGE = 1000;
const DAY_MS = 86_400_000;

/** Every saved check of the business since `days` ago, light columns only: when, which AI, which scan, named or not. */
export async function readHistory(businessId: string, now: Date, days: number): Promise<HistoryRow[]> {
  const since = new Date(now.getTime() - days * DAY_MS).toISOString();
  const rows: HistoryRow[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await createServiceClient()
      // The rows that count: no sample answers once the agency is real (migration 044).
      .from("visibility_results_counted")
      .select("id, run_id, tracked_prompt_id, provider, created_at, business_mentioned")
      .eq("business_id", businessId)
      .gt("created_at", since)
      .not("tracked_prompt_id", "is", null)
      .order("created_at")
      .order("id")
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`Questions: could not read checks: ${error.message}`);
    for (const r of data) {
      if (!r.run_id || !r.tracked_prompt_id || !r.provider || !r.created_at) continue;
      rows.push({ runId: r.run_id, questionId: r.tracked_prompt_id, provider: r.provider, at: new Date(r.created_at), named: r.business_mentioned === true });
    }
    if (data.length < PAGE) break;
  }
  return rows;
}

// Enough to cover every fix a business has; the newest first.
const MAX_FIXES = 100;

/** The business's saved fixes, not dismissed, as plain text to look for a site's name in. */
export async function readFixTexts(businessId: string): Promise<FixText[]> {
  const { data, error } = await createServiceClient()
    .from("opportunities")
    .select("id, title, description, evidence, where_to_apply, recommended_action")
    .eq("business_id", businessId)
    .neq("status", "dismissed")
    .order("created_at", { ascending: false })
    .limit(MAX_FIXES);
  if (error) throw new Error(`Questions: could not read fixes: ${error.message}`);
  return data.map((f) => ({
    id: f.id,
    title: f.title,
    text: [f.description, f.evidence, f.where_to_apply, f.recommended_action].filter(Boolean).join("\n"),
  }));
}
