// Who AI named on each question, and the sites it used when it left you out. Pure, over answers the scans already
// saved: tracked competitors by their tracked name, other businesses as the name extractor saved them.
import { z } from "zod";
import { isOwnSite } from "@/lib/site-type";
import { nameKey, type StandingCheck } from "./checks";

export type Named = { name: string; answers: number; tracked: boolean };
export type SiteUse = { host: string; answers: number };

export type QuestionSummary = {
  answers: number;
  you: number;
  /** Businesses AI named in these answers, most named first. */
  named: Named[];
  /** Sites AI used in the answers that did not name you, most used first. */
  sitesWithoutYou: SiteUse[];
};

const extracted = z.object({ names: z.array(z.object({ name: z.string(), matches: z.string().nullish() })) });
const MAX_NAMES = 3;
const MAX_SITES = 3;

/** Businesses other than you and your tracked competitors that this answer named. */
function untracked(check: StandingCheck): string[] {
  const parsed = extracted.safeParse(check.extracted);
  return parsed.success ? parsed.data.names.filter((n) => !n.matches).map((n) => n.name.trim()) : [];
}

function top<T extends { answers: number }>(counts: Map<string, T>, max: number, key: (t: T) => string): T[] {
  return [...counts.values()].sort((a, b) => b.answers - a.answers || key(a).localeCompare(key(b))).slice(0, max);
}

export function questionSummaries(checks: StandingCheck[], ownDomain: string | null): Map<string, QuestionSummary> {
  const groups = new Map<string, StandingCheck[]>();
  for (const c of checks) groups.set(c.questionId, [...(groups.get(c.questionId) ?? []), c]);
  const out = new Map<string, QuestionSummary>();
  for (const [questionId, group] of groups) {
    const named = new Map<string, Named>();
    const sites = new Map<string, SiteUse>();
    for (const check of group) {
      const seen = new Set<string>();
      const add = (name: string, tracked: boolean) => {
        const k = nameKey(name);
        if (!k || seen.has(k)) return;
        seen.add(k);
        const n = named.get(k) ?? { name, answers: 0, tracked };
        n.answers += 1;
        named.set(k, n);
      };
      for (const name of check.competitors) add(name, true);
      for (const name of untracked(check)) add(name, false);
      if (check.youNamed) continue;
      for (const host of check.sites) {
        if (isOwnSite(host, ownDomain)) continue;
        const s = sites.get(host) ?? { host, answers: 0 };
        s.answers += 1;
        sites.set(host, s);
      }
    }
    out.set(questionId, {
      answers: group.length,
      you: group.filter((c) => c.youNamed).length,
      named: top(named, MAX_NAMES, (n) => n.name),
      sitesWithoutYou: top(sites, MAX_SITES, (s) => s.host).filter((s) => s.answers >= 2),
    });
  }
  return out;
}
