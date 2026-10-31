import type { ProviderId } from "@/modules/scanning";

// Which questions the last scan could not check, per AI (BUG-074). The scan saves no row for a failed check, so a
// check counts as failed when that AI had failures in the scan and the question, asked by it, has no saved answer
// from that AI. Pure and import-free, for the browser and the server.

export type LastScanFacts = {
  /** When the last finished scan started; null before the first one. */
  startedAt: string | null;
  /** Checks per AI that gave no answer in that scan, failed or skipped (scanFailuresFrom). */
  failures: Partial<Record<ProviderId, number>> | null;
  /** checkKey(question, AI) for every answer that scan saved. */
  saved: Set<string>;
};

export type ScanQuestion = { id: string; active: boolean; createdAt?: string | null };

export const checkKey = (questionId: string, model: ProviderId) => `${questionId}:${model}`;

/** The questions the last scan asked: active now and added before it started. */
export function askedInScan<Q extends ScanQuestion>(questions: Q[], startedAt: string | null): Q[] {
  const start = startedAt ? Date.parse(startedAt) : NaN;
  if (Number.isNaN(start)) return [];
  return questions.filter((q) => q.active && !!q.createdAt && Date.parse(q.createdAt) < start);
}

/** checkKey(question, AI) for each check the last scan could not do. */
export function failedChecks(scan: LastScanFacts, questions: ScanQuestion[], models: ProviderId[]): Set<string> {
  const failed = new Set<string>();
  const failing = models.filter((m) => (scan.failures?.[m] ?? 0) > 0);
  if (failing.length === 0) return failed;
  for (const q of askedInScan(questions, scan.startedAt)) {
    for (const m of failing) if (!scan.saved.has(checkKey(q.id, m))) failed.add(checkKey(q.id, m));
  }
  return failed;
}
