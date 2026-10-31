// What "Why you were skipped" offers under an answer that did not name you: the saved fix for a site it used (opens
// that fix on Actions), or, when there is none yet, the fix to add for that site. Server side only: it uses the Sources
// rules for which sites a business can get listed on.
import { answerSiteFix } from "@/modules/sources";
import type { QuestionAnswer } from "./answers";
import { usesSite } from "./focus";
import { fixForSites, type FixText } from "./skipped";

type Ctx = {
  ownDomain: string | null;
  place: string | null;
  /** The question each answer answered. */
  question: (a: QuestionAnswer) => string;
  /** The site a link is about (?site=): only that site's fix is offered, never another site the answer used. */
  site?: string | null;
};

export function withFixOptions<T extends QuestionAnswer>(answers: T[], fixes: FixText[], ctx: Ctx): T[] {
  return answers.map((a) => {
    if (a.namedYou) return { ...a, fix: null, addFix: null };
    const hosts = a.sites.map((s) => s.host);
    const linked = ctx.site ? hosts.filter((h) => usesSite(h, ctx.site!)) : [];
    // From a link about one site, that site only: its saved fix, or adding it.
    const pool = linked.length > 0 ? linked : hosts;
    const fix = fixForSites(fixes, pool);
    const addFix = fix
      ? null
      : answerSiteFix(pool, { ownDomain: ctx.ownDomain, place: ctx.place, label: a.label, question: ctx.question(a), named: [...a.competitors, ...a.others] });
    return { ...a, fix, addFix };
  });
}
