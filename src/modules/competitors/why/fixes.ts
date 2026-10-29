// The saved fixes behind "See why" and Compare: the open fixes cut to what matching needs, each reason tied to the one
// fix that deals with it, and the fixes that name a competitor. Pure (split out of why/service.ts, 2026-10-28).
import { attachFixes, fixRef, type FixRef } from "@/lib/fix-match";
import { whereOf } from "@/lib/fix-where";
import type { CompetitorWhy } from "@/modules/standing";

export type FixLink = { id: string; title: string };

/** An open fix as matching needs it, with its saved status ("open", "todo", "in_progress"), so Compare can say it. */
export type OpenFixRef = FixRef & { status: string };

export type OpenFixRow = {
  id: string;
  title: string;
  description: string | null;
  evidence: string | null;
  recommended_action: string | null;
  category: string | null;
  claude_prompt: string | null;
  status: string;
};

/** Each open fix with where it is fixed, by the same rule and text as the Actions board (toActionItems). */
export function openFixRefs(rows: OpenFixRow[]): OpenFixRef[] {
  const text = (r: OpenFixRow) => [r.title, r.description, r.evidence, r.recommended_action].filter(Boolean).join("\n");
  const clean = (t: string | null) => (t?.trim() ? t.trim() : null);
  return rows.map((r) => ({
    ...fixRef({
      id: r.id,
      where: whereOf({ category: r.category, claudePrompt: clean(r.claude_prompt), text: text(r) }),
      title: r.title,
      recommendedAction: r.recommended_action,
      description: r.description,
    }),
    status: r.status,
  }));
}

/** The reasons with the exact fix for each one, where a saved fix deals with it. */
export function withFixes(why: CompetitorWhy, refs: FixRef[]): CompetitorWhy {
  return { ...why, reasons: attachFixes(why.reasons, refs), allReasons: attachFixes(why.allReasons, refs) };
}

type FixRow = { id: string; title: string; description: string | null; evidence: string | null; recommended_action: string | null };

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Saved fixes that name this competitor, or hold one of its live Google placeholders ({competitor.<id>.rating}). */
export function fixesAbout(rows: FixRow[], competitor: { id: string; name: string; also?: string }): FixLink[] {
  const names = [competitor.name, competitor.also].filter((n): n is string => !!n?.trim()).map((n) => escape(n.trim()));
  const byName = new RegExp(`(^|[^\\p{L}\\p{N}])(${names.join("|")})($|[^\\p{L}\\p{N}])`, "iu");
  const byId = `{competitor.${competitor.id}.`;
  return rows
    .filter((r) => [r.title, r.description, r.evidence, r.recommended_action].some((t) => !!t && (t.includes(byId) || byName.test(t))))
    .map((r) => ({ id: r.id, title: r.title }));
}
