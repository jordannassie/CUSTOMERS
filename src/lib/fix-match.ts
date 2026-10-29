// Ties a likely reason to the one saved fix that deals with it, so "Open this fix" opens that exact fix and never
// just the first fix in a group. Pure and import-light, so server and browser screens share the same rule.
import type { Where } from "./fix-where";

/** A saved fix, cut to what matching needs: where it is fixed and its words (title and steps). */
export type FixRef = { id: string; where: Where; text: string };

const MAX_TEXT = 600;

export function fixRef(fix: { id: string; where: Where; title: string; recommendedAction?: string | null; description?: string | null }): FixRef {
  const text = [fix.title, fix.recommendedAction, fix.description].filter(Boolean).join(" ").toLowerCase().slice(0, MAX_TEXT);
  return { id: fix.id, where: fix.where, text };
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** "review" matches "reviews" and "reviewing" but not "preview": whole words, with an optional ending. */
const wordTest = (word: string) => new RegExp(`(^|[^\\p{L}\\p{N}])${escape(word.toLowerCase())}`, "u");

type Matchable = { where: Where | null; match?: string[]; fixId?: string };

/** The fix for one reason: same place to fix it, and one of the reason's words in the fix. Null when none fits. */
export function fixFor(fact: Matchable, fixes: FixRef[]): string | null {
  if (!fact.where || !fact.match?.length) return null;
  const tests = fact.match.filter((w) => w.trim().length > 2).map(wordTest);
  const hit = fixes.find((f) => f.where === fact.where && tests.some((t) => t.test(f.text)));
  return hit?.id ?? null;
}

/** Each reason with `fixId` set when a saved fix deals with it. Reasons already tied to a fix keep it. */
export function attachFixes<T extends Matchable>(facts: T[], fixes: FixRef[]): T[] {
  if (fixes.length === 0) return facts;
  return facts.map((f) => {
    if (f.fixId) return f;
    const id = fixFor(f, fixes);
    return id ? { ...f, fixId: id } : f;
  });
}
