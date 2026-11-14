import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { allRows } from "../dal";
import { SCAN_MODELS, runFailures, runModels } from "../service";

// The "Latest answers" grid on the admin business page: the newest finished scan's answer per question and model.

export type ResultRow = {
  question: string;
  mentioned: Partial<Record<string, boolean>>;
  /** The saved answer per model, null when the check kept no text. */
  answers: Partial<Record<string, string | null>>;
};

type Run = { id: string; created_at: string; provider: string; failed_by_provider: unknown };

export type FinishedScan = {
  runId: string;
  /** When the scan started (its job was queued), as the history and Scans page show it. */
  startedAt: string;
  /** A scan from before the job queue, when answers were not always saved. */
  older: boolean;
  /** The models the scan set out to ask; empty for older scans, which did not record them. */
  models: string[];
  failures: ReturnType<typeof runFailures>;
};

/** The newer of the last finished job (through its run) and the last finished run from before the job queue. */
export function newestFinished(
  lastJob: { id: string; created_at: string } | null,
  runOfJob: Map<string, Run>,
  lastOldRun: Run | null,
): FinishedScan | null {
  const jobRun = lastJob ? runOfJob.get(lastJob.id) : undefined;
  const fromJob =
    lastJob && jobRun
      ? { runId: jobRun.id, startedAt: lastJob.created_at, older: false, models: runModels(jobRun.provider), failures: runFailures(jobRun.failed_by_provider) }
      : null;
  const fromRun = lastOldRun
    ? { runId: lastOldRun.id, startedAt: lastOldRun.created_at, older: true, models: runModels(lastOldRun.provider), failures: runFailures(lastOldRun.failed_by_provider) }
    : null;
  if (!fromJob || !fromRun) return fromJob ?? fromRun;
  return fromJob.startedAt >= fromRun.startedAt ? fromJob : fromRun;
}

/** Per-question, per-model answers of the newest finished scan (B-26 results), or null when none finished. */
export async function latestResults(scan: FinishedScan | null) {
  if (!scan) return null;
  const rows = await allRows("check results", (from, to) =>
    createServiceClient()
      .from("visibility_results")
      .select("id, question, provider, business_mentioned, answer_text")
      .eq("run_id", scan.runId)
      .order("created_at")
      .order("id")
      .range(from, to),
  );
  const byQuestion = new Map<string, ResultRow>();
  for (const r of rows) {
    const question = r.question ?? "Question not recorded";
    const row = byQuestion.get(question) ?? { question, mentioned: {}, answers: {} };
    row.mentioned[r.provider] = r.business_mentioned;
    row.answers[r.provider] = r.answer_text;
    byQuestion.set(question, row);
  }
  return {
    at: scan.startedAt,
    older: scan.older,
    // A model the scan set out to ask, or one that answered: the grid says "Failed" where such a model has no answer.
    asked: SCAN_MODELS.filter((m) => scan.models.includes(m) || rows.some((r) => r.provider === m)),
    failures: scan.failures,
    rows: [...byQuestion.values()],
  };
}
