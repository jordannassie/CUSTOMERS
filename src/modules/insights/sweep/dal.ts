import "server-only";
// visibility_runs reads and writes for explaining scans whose fixes never came (sweep/service.ts). Service role: the
// scan worker runs with no user session.
import { createServiceClient } from "@/lib/supabase/service";
import { sweepPlan, sweepWindow, type SweepRun } from "./service";

const toRun = (r: { id: string; business_id: string; completed_at: string | null }): SweepRun => ({
  id: r.id,
  businessId: r.business_id,
  completedAt: r.completed_at ?? "",
});

/** The finished run of a scan job whose explanation never ran; null when there is none or it has its fixes. */
export async function unexplainedRunOfJob(jobId: string): Promise<string | null> {
  const { data, error } = await createServiceClient()
    .from("visibility_runs")
    .select("id")
    .eq("scan_job_id", jobId)
    .eq("status", "completed")
    .is("explained_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`Insights: could not load the job's scan run: ${error.message}`);
  return data?.id ?? null;
}

/**
 * Up to `limit` recently finished runs to explain again, newest first (sweepPlan). Runs a newer scan replaced are marked
 * explained here, so they stop coming back.
 */
export async function runsToSweep(now: Date, limit: number): Promise<string[]> {
  const db = createServiceClient();
  const { from, to } = sweepWindow(now);
  const { data, error } = await db
    .from("visibility_runs")
    .select("id, business_id, completed_at")
    .eq("status", "completed")
    .is("explained_at", null)
    .gt("completed_at", from)
    .lt("completed_at", to)
    .order("completed_at", { ascending: false })
    .limit(limit * 5);
  if (error) throw new Error(`Insights: could not load runs without fixes: ${error.message}`);
  if (data.length === 0) return [];
  const businessIds = [...new Set(data.map((r) => r.business_id))];
  const later = await db
    .from("visibility_runs")
    .select("id, business_id, completed_at")
    .eq("status", "completed")
    .in("business_id", businessIds)
    .gt("completed_at", from);
  if (later.error) throw new Error(`Insights: could not load newer runs: ${later.error.message}`);
  const plan = sweepPlan(data.map(toRun), later.data.map(toRun), limit);
  if (plan.superseded.length > 0) {
    const marked = await db.from("visibility_runs").update({ explained_at: now.toISOString() }).in("id", plan.superseded).is("explained_at", null);
    if (marked.error) console.error(`Could not mark replaced runs explained: ${marked.error.message}`);
  }
  return plan.explain;
}

/**
 * Takes a run for the sweep by setting explained_at while it is still unset, so two workers never explain it twice.
 * False when another worker took it first. explainAfterScan sets it again when it finishes.
 */
export async function claimExplanation(runId: string, now: Date): Promise<boolean> {
  const { data, error } = await createServiceClient()
    .from("visibility_runs")
    .update({ explained_at: now.toISOString() })
    .eq("id", runId)
    .is("explained_at", null)
    .select("id");
  if (error) throw new Error(`Insights: could not take the run to explain: ${error.message}`);
  return data.length > 0;
}
