// What a finished explanation does to the saved fixes (MVP_SPEC 7.2). Pure, so every case is unit tested.
import type { Explanation } from "../explain";
import { fixTitleKey, planSave, type ExistingFix, type SavePlan } from "../service";

/**
 * New AI reasons rewrite, add and remove the open scan fixes (planSave). When the writer failed and the fixed rules
 * stood in, nothing is rewritten or removed and only rules not already listed are added: a failed explanation must
 * never leave a business with fewer fixes than it had (2026-10-14, Car4Tune went from its fixes to 1), nor replace
 * the AI's text with the rules' text.
 */
export function saveFor(existing: ExistingFix[], explanation: Pick<Explanation, "source" | "drafts">): SavePlan {
  const plan = planSave(existing, explanation.drafts);
  if (explanation.source === "ai") return plan;
  const listed = new Set(existing.map((o) => fixTitleKey(o.title)));
  return { insert: plan.insert.filter((d) => !listed.has(fixTitleKey(d.title))), update: [], removeIds: [] };
}

/** The provider_errors line for an explanation that fell back to the fixed rules; null when nothing failed. */
export function fallbackMessage(explanation: Pick<Explanation, "source" | "fallbackReason" | "dropped">): string | null {
  if (explanation.source !== "rules" || !explanation.fallbackReason) return null;
  // A scan with no saved answers has nothing to explain: not a failure.
  if (explanation.fallbackReason === "the scan has no saved answers") return null;
  const dropped = explanation.dropped.map((d) => `"${d.title}" (${d.issues.join(", ")})`).join("; ");
  return `Why competitors win fell back to the fixed rules: ${explanation.fallbackReason}${dropped ? `. Dropped: ${dropped}` : ""}`.slice(0, 500);
}

// How long a finished scan may wait for its fixes before the pages stop saying "Working out your fixes": the writer
// takes up to 2 minutes, its backup as long again.
export const EXPLAIN_WAIT_MS = 6 * 60_000;

/** True while the latest completed scan's fixes are still being worked out. */
export function fixesPending(latest: { completedAt: string | null; explainedAt: string | null } | null, now: Date): boolean {
  if (!latest?.completedAt || latest.explainedAt) return false;
  return now.getTime() - Date.parse(latest.completedAt) < EXPLAIN_WAIT_MS;
}
