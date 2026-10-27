// The report's numbers from the score's saved answers (the last 30 days, suggested questions only). Pure.
import { whereOf, type Where } from "@/lib/fix-where";
import { isOwnSite } from "@/lib/site-type";
import type { StandingCheck } from "@/modules/standing";
import type { ActionLine, QuestionLine, SourceLine } from "./document";

export const MAX_SOURCES = 8;
export const MAX_ACTIONS = 10;

const key = (name: string) => name.trim().toLowerCase();

/** How many answers cited the business's own website. */
export function citations(checks: StandingCheck[], domain: string | null) {
  return { cited: checks.filter((c) => c.sites.some((h) => isOwnSite(h, domain))).length, answers: checks.length, hasSite: !!domain };
}

/**
 * Share of AI picks: of every time AI named one of these businesses, the percent that named each. `names` lists the
 * tracked names a row counts (a chain row counts each tracked branch once per answer). Null for every row with no names.
 */
export function shares(checks: StandingCheck[], rows: { isYou: boolean; names: string[] }[]): (number | null)[] {
  const counts = rows.map((row) => {
    const wanted = new Set(row.names.map(key));
    return checks.filter((c) => (row.isYou ? c.youNamed : c.competitors.some((n) => wanted.has(key(n))))).length;
  });
  const total = counts.reduce((a, b) => a + b, 0);
  return counts.map((n) => (total === 0 ? null : Math.round((100 * n) / total)));
}

/** The sites AI used most, with how many of those answers named the business. */
export function sourceRows(checks: StandingCheck[], domain: string | null, max = MAX_SOURCES): SourceLine[] {
  const rows = new Map<string, SourceLine>();
  for (const check of checks) {
    for (const host of new Set(check.sites)) {
      const row = rows.get(host) ?? { host, answers: 0, namedYou: 0, own: isOwnSite(host, domain) };
      row.answers += 1;
      if (check.youNamed) row.namedYou += 1;
      rows.set(host, row);
    }
  }
  return [...rows.values()].sort((a, b) => b.answers - a.answers || a.host.localeCompare(b.host)).slice(0, max);
}

type TrendCell = { named: number; checked: number; change: "up" | "down" | "same" | null } | null;

/** Each suggested question: answers that named the business over 30 days, and its move at the latest weekly scan. */
export function questionRows(questions: { id: string; prompt: string; cells: TrendCell[] }[], checks: StandingCheck[]): QuestionLine[] {
  return questions.map((q) => {
    const asked = checks.filter((c) => c.questionId === q.id);
    const latest = [...q.cells].reverse().find((c) => c !== null) ?? null;
    return { question: q.prompt, named: asked.filter((c) => c.youNamed).length, answers: asked.length, trend: latest?.change ?? null };
  });
}

export type OpenFix = {
  title: string;
  impact: string;
  status: string;
  category: string | null;
  claude_prompt: string | null;
  where_to_apply: string | null;
  evidence: string | null;
  description: string | null;
  affected_url: string | null;
  created_at: string;
};

// Still to do: Suggested, To do and In progress. Done and dismissed fixes are not in the plan.
export const PLAN_STATUSES = ["open", "todo", "in_progress"];
const IMPACT_ORDER: Record<ActionLine["impact"], number> = { high: 0, medium: 1, low: 2 };
// A saved fix whose text still holds a Google value placeholder is filled live on the Actions page; the report never
// shows Google values (D-73), so that text is left out.
const PLACEHOLDER = /\{[a-z_]+(?:\.[0-9a-f-]{36})?\.[a-z_]+\}/i;

const plain = (text: string | null) => {
  const t = text?.trim();
  return t && !PLACEHOLDER.test(t) ? t : null;
};

const WHERE_TEXT: Record<Where, string> = {
  website: "Your website",
  google_listing: "Google Business Profile",
  other_places: "Review and listing sites",
};

// Older fixes have no saved place: the same rule the Actions page uses (lib/fix-where.ts).
function whereFor(fix: OpenFix): string {
  const text = [fix.title, fix.description, fix.evidence].filter(Boolean).join("\n");
  return plain(fix.where_to_apply) ?? WHERE_TEXT[whereOf({ category: fix.category, claudePrompt: fix.claude_prompt, text })];
}

/** The action plan: open fixes, most important first, then newest; each with where to make it and why. */
export function actionRows(fixes: OpenFix[], max = MAX_ACTIONS): ActionLine[] {
  return fixes
    .filter((f) => PLAN_STATUSES.includes(f.status) && !f.affected_url?.startsWith("checklist:") && !PLACEHOLDER.test(f.title))
    .map((f) => ({ ...f, impact: (f.impact === "high" || f.impact === "low" ? f.impact : "medium") as ActionLine["impact"] }))
    .sort((a, b) => IMPACT_ORDER[a.impact] - IMPACT_ORDER[b.impact] || b.created_at.localeCompare(a.created_at))
    .slice(0, max)
    .map((f) => ({ title: f.title, impact: f.impact, where: whereFor(f), why: plain(f.evidence) ?? plain(f.description) }));
}
