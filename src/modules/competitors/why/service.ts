// "See why" on the Competitors page: the standing in one sentence and the saved fixes that are about this competitor.
// Pure. The facts themselves come from the standing module, over answers the scans already saved.
import { whereOf, type Where } from "@/lib/fix-where";
import type { Standing } from "@/modules/scanning";
import { questionLine, type CompetitorWhy, type Fact } from "@/modules/standing";

export type FixLink = { id: string; title: string };

/** trackedName: the competitor as tracked, which the leaderboard row is named by; why.name is the name AI used. */
/** openFixes: the Opportunities groups with fixes to do, so a "Fix on ..." label links only where there is one. */
export type WhyPanel = { competitorId: string; trackedName: string; why: CompetitorWhy; fixes: FixLink[]; openFixes: Where[] };

const answers = (n: number) => `${n} ${n === 1 ? "answer" : "answers"}`;

/** "AI named Bean Tires in 12 of 40 answers over the last 30 days, and you in 5." */
export function standingSentence(why: Pick<CompetitorWhy, "name" | "answers" | "them" | "you">, standing: Standing | null): string {
  if (why.answers === 0) return "There are no answers from the last 30 days to compare yet.";
  const counts =
    standing === "ahead"
      ? `AI named you in ${why.you} of ${answers(why.answers)} over the last 30 days, and ${why.name} in ${why.them}.`
      : `AI named ${why.name} in ${why.them} of ${answers(why.answers)} over the last 30 days, and you in ${why.you}.`;
  return standing === "about_same" ? `${counts} That gap is too small to call.` : counts;
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

/** The Overview's "Why they're ahead" card: one competitor, its clearest facts, and a link to the full panel. */
export type WhyCard = {
  competitorId: string;
  name: string;
  /** behind: you are behind this competitor; ahead: you lead every competitor compared. */
  side: "behind" | "ahead";
  /** "On "best tire shop in Dallas", AI named Bean Tires in 5 of 6 answers and you in 0." */
  question: string | null;
  facts: Fact[];
  openFixes: Where[];
};

const MAX_FACTS = 2;

/**
 * The competitor furthest ahead of you, from the leaderboard's own standing (never re-decided here). When you lead
 * them all, the one closest behind you. Null while no competitor is compared over the whole window.
 */
export function whyCard(rows: { name: string; isYou: boolean; score: number | null; standing: Standing | null }[], panels: WhyPanel[]): WhyCard | null {
  const compared = rows.filter((r) => !r.isYou && r.standing !== null && r.score !== null);
  const ahead = compared.filter((r) => r.standing === "behind").sort((a, b) => b.score! - a.score!)[0];
  const row = ahead ?? (compared.every((r) => r.standing === "ahead") ? [...compared].sort((a, b) => b.score! - a.score!)[0] : undefined);
  const panel = row && panels.find((p) => p.trackedName === row.name);
  if (!row || !panel) return null;
  const { why } = panel;
  if (ahead) {
    const q = why.questionsTheyWin[0];
    return {
      competitorId: panel.competitorId,
      name: why.name,
      side: "behind",
      question: q ? questionLine(q, why.name) : null,
      facts: why.reasons.slice(0, MAX_FACTS),
      openFixes: panel.openFixes,
    };
  }
  return { competitorId: panel.competitorId, name: why.name, side: "ahead", question: null, facts: why.youLead.slice(0, MAX_FACTS), openFixes: [] };
}

/** The first sentence of a fact: "AI used yelp.com in 9 answers that named Bean House and not you." */
const firstSentence = (text: string) => text.split(/(?<=\.)\s/)[0];

/**
 * One line for the report, its PDF and the weekly email, from the Overview card's data (saved answers only, so no
 * Google values): "A likely reason Bean House is ahead of you: AI used yelp.com in 9 answers ...". Null without a fact.
 */
export function whySentence(card: WhyCard | null | undefined): string | null {
  const fact = card?.facts[0];
  if (!card || !fact) return null;
  const lead = card.side === "behind" ? `A likely reason ${card.name} is ahead of you` : `A likely reason you are ahead of ${card.name}`;
  // Names (AI, Google, a business) keep their capital; only a plain opening word is lowered after the colon.
  return `${lead}: ${firstSentence(fact.text).replace(/^(Your|The) /, (w) => w.toLowerCase())}`;
}

type OpenFixRow = { title: string; description: string | null; evidence: string | null; recommended_action: string | null; category: string | null; claude_prompt: string | null };

/** Same rule and same text as the Opportunities page groups (opportunities/service.ts toItems). */
export function openWhere(rows: OpenFixRow[]): Where[] {
  const text = (r: OpenFixRow) => [r.title, r.description, r.evidence, r.recommended_action].filter(Boolean).join("\n");
  const clean = (t: string | null) => (t?.trim() ? t.trim() : null);
  return [...new Set(rows.map((r) => whereOf({ category: r.category, claudePrompt: clean(r.claude_prompt), text: text(r) })))];
}
