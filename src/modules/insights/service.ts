// Pure helpers for storing reasons and showing them with live Google values (MVP_SPEC 7.2, D-73).
import type { OpportunityDraft, WriterUsage } from "./explain";
import type { Signals } from "./facts";
import { fillPlaceholders, formatSignal, type Lookup } from "./placeholders";
import { EXPLAIN_PRICE } from "./prompts/explain.v1";

// Legacy statuses: "open" is what a new scan replaces; anything the user touched stays.
const REPLACEABLE = "open";

const titleKey = (t: string) => t.trim().toLowerCase();

/**
 * New reasons replace the open ones from earlier scans. A reason the user already dismissed, marked
 * done or started is not added again under the same title.
 */
export function planSave(
  existing: { id: string; title: string; status: string }[],
  drafts: OpportunityDraft[],
): { insert: OpportunityDraft[]; removeIds: string[] } {
  const kept = new Set(existing.filter((o) => o.status !== REPLACEABLE).map((o) => titleKey(o.title)));
  const seen = new Set<string>();
  const insert = drafts.filter((d) => {
    const k = titleKey(d.title);
    if (kept.has(k) || seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  return { insert, removeIds: existing.filter((o) => o.status === REPLACEABLE).map((o) => o.id) };
}

export function usageCostUsd(usage: WriterUsage): number {
  const cost = (usage.inputTokens * EXPLAIN_PRICE.inputPerMTok + usage.outputTokens * EXPLAIN_PRICE.outputPerMTok) / 1_000_000;
  return Math.round(cost * 1_000_000) / 1_000_000;
}

const COMPETITOR_ID = /\{competitor\.([0-9a-f-]{36})\.[a-z_]+\}/g;

type TextFields = { description: string | null; evidence: string | null; recommended_action: string | null };

/** Competitor ids the stored text refers to, so only those places are looked up. */
export function referencedCompetitors(rows: TextFields[]): Set<string> {
  const ids = new Set<string>();
  for (const row of rows) {
    for (const text of [row.description, row.evidence, row.recommended_action]) {
      for (const m of (text ?? "").matchAll(COMPETITOR_ID)) ids.add(m[1]);
    }
  }
  return ids;
}

export function hasPlaceValues(row: TextFields): boolean {
  return [row.description, row.evidence, row.recommended_action].some((t) => /\{(business|competitor\.[0-9a-f-]{36})\.[a-z_]+\}/.test(t ?? ""));
}

export function usesBusinessValues(rows: TextFields[]): boolean {
  return rows.some((r) => [r.description, r.evidence, r.recommended_action].some((t) => t?.includes("{business.")));
}

export function liveLookup(
  businessPlaceId: string | null,
  competitorPlaceIds: Map<string, string | null>,
  signals: Map<string, Signals | null>,
): Lookup {
  return (subject, field) => {
    const placeId = "business" in subject ? businessPlaceId : (competitorPlaceIds.get(subject.competitorId) ?? null);
    return placeId ? formatSignal(signals.get(placeId), field) : null;
  };
}

export function fillOpportunity<T extends TextFields>(row: T, lookup: Lookup): T {
  const fill = (text: string | null) => (text === null ? null : fillPlaceholders(text, lookup));
  return {
    ...row,
    description: fill(row.description),
    evidence: fill(row.evidence),
    recommended_action: fill(row.recommended_action),
  };
}
