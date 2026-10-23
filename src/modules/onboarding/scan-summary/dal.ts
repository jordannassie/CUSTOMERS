import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { loadOverview } from "@/modules/overview";
import { loadAlsoRecommended, loadScoreReport } from "@/modules/scanning";
import { namedMostText, scanProgress, type FirstScanSummary, type ModelProgress } from "./service";

export async function isAgencyBusiness(agencyId: string, businessId: string): Promise<boolean> {
  const { data, error } = await createServiceClient()
    .from("businesses")
    .select("id")
    .eq("id", businessId)
    .eq("agency_id", agencyId)
    .maybeSingle();
  if (error) throw new Error(`First scan: could not read the business: ${error.message}`);
  return data !== null;
}

// The loaders below trust their caller to have checked the business is the agency's (isAgencyBusiness).

/** Answers saved so far by the business's latest scan, per model, with the question each model is on. */
export async function loadFirstScanProgress(businessId: string): Promise<ModelProgress[]> {
  const db = createServiceClient();
  const [business, questions, job] = await Promise.all([
    db.from("businesses").select("models").eq("id", businessId).single(),
    db.from("tracked_prompts").select("prompt").eq("business_id", businessId).eq("active", true).order("created_at"),
    db.from("scan_jobs").select("id").eq("business_id", businessId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  for (const r of [business, questions, job]) if (r.error) throw new Error(`First scan progress: ${r.error.message}`);

  const done = new Map<string, number>();
  const run = job.data
    ? await db.from("visibility_runs").select("id").eq("scan_job_id", job.data.id).maybeSingle()
    : null;
  if (run?.error) throw new Error(`First scan progress: ${run.error.message}`);
  if (run?.data) {
    const saved = await db.from("visibility_results").select("provider").eq("run_id", run.data.id);
    if (saved.error) throw new Error(`First scan progress: ${saved.error.message}`);
    for (const r of saved.data) done.set(r.provider, (done.get(r.provider) ?? 0) + 1);
  }
  return scanProgress(business.data!.models ?? [], questions.data!.map((q) => q.prompt), done);
}

/** The score, the business AI named most and the first fix, for the screen after the first scan. */
export async function loadFirstScanSummary(agencyId: string, businessId: string): Promise<FirstScanSummary | null> {
  const now = new Date();
  const [overview, report, also] = await Promise.all([
    loadOverview(agencyId, businessId, now),
    loadScoreReport(agencyId, businessId, now),
    loadAlsoRecommended(agencyId, businessId, now),
  ]);
  if (!overview || !report || !also) return null;
  const fix = overview.opportunities[0];
  return {
    score: overview.score && { value: overview.score.value, tone: overview.score.tone, sentence: overview.score.sentence },
    namedMost: namedMostText(report.competitors, also),
    firstFix: fix ? { title: fix.title, impact: fix.impact } : null,
  };
}
