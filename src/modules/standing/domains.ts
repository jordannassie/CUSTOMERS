// "Where AI looked" on Compare (dashboard redesign): each site the answers used, how many of those answers named them
// and how many named you, so a site that names them and skips you stands out. Pure, over the score's own answers.
import { namedIn, type StandingCheck } from "./checks";

export type DomainRow = { host: string; answers: number; them: number; you: number; result: "they_win" | "tie" | "you_win" };

const MAX_ROWS = 15;

export function domainRows(checks: StandingCheck[], tracked: string, max = MAX_ROWS): DomainRow[] {
  const rows = new Map<string, { answers: number; them: number; you: number }>();
  for (const check of checks) {
    const them = namedIn(check, tracked);
    for (const host of new Set(check.sites)) {
      const r = rows.get(host) ?? { answers: 0, them: 0, you: 0 };
      r.answers += 1;
      if (them) r.them += 1;
      if (check.youNamed) r.you += 1;
      rows.set(host, r);
    }
  }
  return [...rows]
    .map(([host, r]) => ({ host, ...r, result: r.them > r.you ? ("they_win" as const) : r.you > r.them ? ("you_win" as const) : ("tie" as const) }))
    .sort((a, b) => b.answers - a.answers || b.them - b.you - (a.them - a.you) || a.host.localeCompare(b.host))
    .slice(0, max);
}
