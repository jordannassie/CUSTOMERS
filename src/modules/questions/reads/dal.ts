import "server-only";
import { loadLastScanFailures, scanNoticeText } from "@/modules/overview";
import { CHECK_MODELS, type ProviderId } from "@/modules/scanning";
import { createServiceClient } from "@/lib/supabase/service";
import { latestAnswers, type QuestionAnswer } from "../answers";
import type { HistoryRow } from "../history";
import { askedInScan, checkKey, failedChecks, type ScanQuestion } from "../last-scan";
import { type FixText } from "../skipped";
import { withFixOptions } from "../fix-options";

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
    .select("id, title, status, description, evidence, where_to_apply, recommended_action")
    .eq("business_id", businessId)
    .neq("status", "dismissed")
    .order("created_at", { ascending: false })
    .limit(MAX_FIXES);
  if (error) throw new Error(`Questions: could not read fixes: ${error.message}`);
  return data.map((f) => ({
    id: f.id,
    title: f.title,
    status: f.status,
    text: [f.description, f.evidence, f.where_to_apply, f.recommended_action].filter(Boolean).join("\n"),
  }));
}

const isModel = (m: string): m is ProviderId => m in CHECK_MODELS;

export type LastScanView = {
  /** Which AIs the last scan could not check; null when every check worked. */
  notice: string | null;
  /** checkKey(question, AI) for each check the last scan could not do. */
  failed: Set<string>;
};

/** What the last finished scan could not check, for the business's chosen AIs and its questions now. */
export async function readLastScan(businessId: string, models: ProviderId[], questions: ScanQuestion[]): Promise<LastScanView> {
  const scan = await loadLastScanFailures(businessId);
  if (!scan.runId || !scan.failures || Object.keys(scan.failures).length === 0) return { notice: null, failed: new Set() };
  const saved = new Set<string>();
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await createServiceClient()
      .from("visibility_results")
      .select("id, tracked_prompt_id, provider")
      .eq("run_id", scan.runId)
      .not("tracked_prompt_id", "is", null)
      .order("id")
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`Questions: could not read the last scan: ${error.message}`);
    for (const r of data) if (r.tracked_prompt_id && isModel(r.provider)) saved.add(checkKey(r.tracked_prompt_id, r.provider));
    if (data.length < PAGE) break;
  }
  const asked = askedInScan(questions, scan.startedAt).length || questions.filter((q) => q.active).length;
  return {
    notice: scanNoticeText(models, scan.failures, asked, scan.skipped),
    failed: failedChecks({ startedAt: scan.startedAt, failures: scan.failures, saved }, questions, models),
  };
}

// Enough rows to find the newest answer from every model, even after a few scans with one model failing.
const ANSWER_ROWS = 30;

/** "Orange, CA" for the guide sites' fix. */
export const placeOf = (city: string | null, region: string | null) => [city, region].filter(Boolean).join(", ") || null;

/** The latest answer per model for one question (BUG-089); null when the question is not this agency's. */
export async function loadQuestionAnswers(agencyId: string, businessId: string, questionId: string): Promise<QuestionAnswer[] | null> {
  const db = createServiceClient();
  const [business, question, fixes] = await Promise.all([
    db.from("businesses").select("models, domain, primary_city, primary_region").eq("id", businessId).eq("agency_id", agencyId).maybeSingle(),
    db.from("tracked_prompts").select("id, prompt").eq("id", questionId).eq("business_id", businessId).maybeSingle(),
    readFixTexts(businessId),
  ]);
  for (const r of [business, question]) if (r.error) throw new Error(`Questions: ${r.error.message}`);
  if (!business.data || !question.data) return null;
  // The rows that count: never sample answers once the agency is real (migration 044).
  const { data, error } = await db
    .from("visibility_results_counted")
    .select("provider, created_at, business_mentioned, competitors_mentioned, answer_text, cached, extracted_names, cited_sources")
    .eq("business_id", businessId)
    .eq("tracked_prompt_id", questionId)
    .order("created_at", { ascending: false })
    .limit(ANSWER_ROWS);
  if (error) throw new Error(`Questions: could not load answers: ${error.message}`);
  const rows = data.map((r) => ({
    provider: r.provider ?? "",
    created_at: r.created_at ?? "",
    business_mentioned: r.business_mentioned ?? false,
    competitors_mentioned: r.competitors_mentioned,
    answer_text: r.answer_text,
    cached: r.cached,
    extracted_names: r.extracted_names,
    cited_sources: r.cited_sources,
  }));
  // "Why you were skipped" opens the saved fix for a site the answer used, or offers to add one.
  const b = business.data;
  return withFixOptions(latestAnswers(rows, b.models.filter(isModel)), fixes, {
    ownDomain: b.domain,
    place: placeOf(b.primary_city, b.primary_region),
    question: () => question.data!.prompt,
  });
}
