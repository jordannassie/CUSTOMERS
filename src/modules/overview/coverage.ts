// Which AIs a score rests on, and what the last scan said about the others: failed checks, and AIs left out
// because they were unavailable (BUG-074, claude-outage). Pure.
import type { ProviderId } from "@/modules/scanning";
import { listNames } from "./method";

export const MODEL_LABELS: Record<ProviderId, string> = {
  openai: "ChatGPT",
  anthropic: "Claude",
  perplexity: "Perplexity",
};

/** Failed checks per AI in the latest finished scan. */
export type ScanFailures = Partial<Record<ProviderId, number>>;

type StoredFailure = { failed?: unknown; skipped?: unknown } | undefined;
const count = (n: unknown) => (typeof n === "number" && n > 0 ? n : 0);

/**
 * visibility_runs.failed_by_provider ({"anthropic": {"failed": 12, "reason": "..."}}) as checks per AI that gave no
 * answer: failed, or skipped because the AI was unavailable ({"anthropic": {"failed": 0, "skipped": 12}}).
 */
export function scanFailuresFrom(value: unknown): ScanFailures | null {
  if (!value || typeof value !== "object") return null;
  const failures: ScanFailures = {};
  for (const id of Object.keys(MODEL_LABELS) as ProviderId[]) {
    const entry = (value as Record<string, StoredFailure>)[id];
    const missing = count(entry?.failed) + count(entry?.skipped);
    if (missing > 0) failures[id] = missing;
  }
  return failures;
}

/** The AIs the last scan left out because they were unavailable. */
export function scanSkipsFrom(value: unknown): ProviderId[] {
  if (!value || typeof value !== "object") return [];
  return (Object.keys(MODEL_LABELS) as ProviderId[]).filter((id) => count((value as Record<string, StoredFailure>)[id]?.skipped) > 0);
}

const SKIPPED = (names: string[]) => `${listNames(names)} ${names.length === 1 ? "was" : "were"} skipped because ${names.length === 1 ? "it's" : "they're"} unavailable`;

/** Says which AIs the score rests on when a chosen one has no checks. */
export function coverageText(models: { label: string; score: number | null; notChecked: boolean; skipped?: boolean }[]): string | null {
  const scored = models.filter((m) => m.score !== null).map((m) => m.label);
  const missing = models.filter((m) => m.score === null);
  if (missing.length === 0 || scored.length === 0) return null;
  const skipped = missing.filter((m) => m.skipped).map((m) => m.label);
  const failed = missing.filter((m) => m.notChecked && !m.skipped).map((m) => m.label);
  const waiting = missing.filter((m) => !m.notChecked && !m.skipped).map((m) => m.label);
  const parts = [`Based on ${listNames(scored)}.`];
  if (skipped.length > 0) parts.push(`${SKIPPED(skipped)}.`);
  if (failed.length > 0) parts.push(`${listNames(failed)} couldn't be checked.`);
  if (waiting.length > 0) parts.push(`${listNames(waiting)} ${waiting.length === 1 ? "has" : "have"} no checks yet.`);
  return parts.join(" ");
}

export function scanNoticeText(
  models: ProviderId[],
  failures: ScanFailures | null,
  questions: number,
  skippedIds: ProviderId[] = [],
): string | null {
  const skipped = models.filter((id) => skippedIds.includes(id));
  const failed = models.filter((id) => (failures?.[id] ?? 0) > 0 && !skipped.includes(id));
  if (failed.length === 0 && skipped.length === 0) return null;
  const all = failed.filter((id) => (failures?.[id] ?? 0) >= questions).map((id) => MODEL_LABELS[id]);
  const some = failed.filter((id) => (failures?.[id] ?? 0) < questions).map((id) => MODEL_LABELS[id]);
  const parts = [
    skipped.length > 0 ? SKIPPED(skipped.map((id) => MODEL_LABELS[id])) : null,
    all.length > 0 ? `${listNames(all)} couldn't be checked` : null,
    some.length > 0 ? `${listNames(some)} couldn't answer some questions` : null,
  ].filter(Boolean);
  const ending = failed.length === 0 ? "Skipped checks use no credits." : "We'll try again in the next scan. Failed checks are never charged.";
  return `In the last scan, ${parts.join(", and ")}. ${ending}`;
}
