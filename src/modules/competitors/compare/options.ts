// Compare's picker (dashboard redesign): one option per business on the leaderboard, with its score, standing and
// color. Pure.
import { competitorColor } from "@/lib/series-colors";
import { rowName } from "../chain";
import type { LeaderRow } from "../service";

export type CompareOption = { id: string; name: string; score: number | null; standing: LeaderRow["standing"]; color: string };

/** The leaderboard row a tracked name is counted under: its own, or its chain's. */
export const rowFor = (leaderboard: LeaderRow[], tracked: string) =>
  leaderboard.find((r) => !r.isYou && (r.name === tracked || r.chain?.tracked.includes(tracked))) ?? null;

/**
 * One option per leaderboard row: two tracked branches of one chain share a row ("Bean House (all locations)"), so
 * the picker lists it once, under the branch the row's score is from. `idFor` sends either branch's id to that option.
 */
export function pickerOptions(
  panels: { competitorId: string; trackedName: string; why: { name: string } }[],
  leaderboard: LeaderRow[],
  order: string[],
): { options: CompareOption[]; idFor: Map<string, string> } {
  const byRow = new Map<LeaderRow | string, (typeof panels)[number]>();
  for (const p of panels) {
    const row = rowFor(leaderboard, p.trackedName);
    const key = row ?? p.competitorId;
    const kept = byRow.get(key);
    if (!kept || (row && p.trackedName === row.name && kept.trackedName !== row.name)) byRow.set(key, p);
  }
  const idFor = new Map<string, string>();
  const options = [...byRow].map(([key, p]) => {
    const row = typeof key === "string" ? null : key;
    for (const q of panels) if (q === p || (row && rowFor(leaderboard, q.trackedName) === row)) idFor.set(q.competitorId, p.competitorId);
    return {
      id: p.competitorId,
      name: row ? rowName(row) : p.why.name,
      score: row?.score ?? null,
      standing: row?.standing ?? null,
      color: competitorColor(order, row?.name ?? p.trackedName),
    };
  });
  return { options, idFor };
}
