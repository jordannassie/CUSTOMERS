// Pure helpers for storing reasons and showing them with live Google values (MVP_SPEC 7.2, D-73).
import type { OpportunityDraft, WriterUsage } from "./explain";
import type { Signals } from "./facts";
import { fillPlaceholders, formatSignal, type Lookup } from "./placeholders";
import { aiCostUsd } from "@/modules/ai";
import { EXPLAIN_MODEL } from "./prompts/explain.v2";

import { trackedWording } from "./tracked-wording";

const titleKey = (t: string) => t.trim().toLowerCase();
/** Stored titles went through trackedWording, raw drafts did not: compare both the same way. */
export const fixTitleKey = (title: string) => titleKey(trackedWording(title));

export type ExistingFix = { id: string; title: string; status: string; source: string; affected_url: string | null };
export type SavePlan = { insert: OpportunityDraft[]; update: { id: string; draft: OpportunityDraft }[]; removeIds: string[] };

// Only a fix a scan wrote and nobody has taken up yet ("open", Suggested) is the scan's to rewrite or remove.
const isScanOpen = (o: ExistingFix) => o.status === "open" && o.source === "scan" && !o.affected_url?.startsWith("checklist:");

/**
 * New reasons rewrite the open scan fixes with the same title in place (same id, so ?fix= links and "new this week"
 * hold), are added when new, and the open scan fixes no longer suggested are removed. A fix the user already took
 * up, dismissed or finished, one added from Compare, Sources or by hand, and a checklist item are left as they are,
 * and the same title is not added again.
 */
export function planSave(existing: ExistingFix[], drafts: OpportunityDraft[]): SavePlan {
  const kept = new Set(existing.filter((o) => !isScanOpen(o)).map((o) => fixTitleKey(o.title)));
  const replaceable = new Map<string, ExistingFix>();
  for (const o of existing) if (isScanOpen(o) && !replaceable.has(fixTitleKey(o.title))) replaceable.set(fixTitleKey(o.title), o);

  const seen = new Set<string>();
  const matched = new Set<string>();
  const plan: SavePlan = { insert: [], update: [], removeIds: [] };
  for (const draft of drafts) {
    const k = fixTitleKey(draft.title);
    if (seen.has(k)) continue;
    seen.add(k);
    if (kept.has(k)) continue;
    const row = replaceable.get(k);
    if (row) {
      plan.update.push({ id: row.id, draft });
      matched.add(row.id);
    } else plan.insert.push(draft);
  }
  plan.removeIds = existing.filter((o) => isScanOpen(o) && !matched.has(o.id)).map((o) => o.id);
  return plan;
}

/** The writer's cost at the list price of the model that actually answered (Claude, or the ChatGPT backup). */
export function usageCostUsd(usage: WriterUsage, model: string = EXPLAIN_MODEL): number {
  return aiCostUsd(model, { inputTokens: usage.inputTokens, cachedInputTokens: 0, outputTokens: usage.outputTokens });
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
