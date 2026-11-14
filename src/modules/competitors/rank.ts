// Where you stand among the businesses you track, by 30-day score (never a rank in AI, D-63). One rule for the
// Competitors tiles, the Overview and the report, so the three never disagree (audit, 2026-10-28). Pure.
import type { LeaderRow } from "./service";

export type TrackedPlace = {
  /** 1 when no scored competitor is above you; ties go to you. */
  place: number;
  /** You plus every competitor with a score that is not still collecting. */
  of: number;
  /** The top competitor above you; null when you lead. */
  leader: LeaderRow | null;
  /** The competitor just above you, the next one to pass; null when you lead. */
  above: LeaderRow | null;
};

/** Null until you have a score. Competitors still collecting or without a score are left out of the count. */
export function placeAmongTracked(rows: LeaderRow[]): TrackedPlace | null {
  const you = rows.find((r) => r.isYou);
  if (!you || you.score === null) return null;
  const others = rows.filter((r) => !r.isYou && r.score !== null && !r.collecting);
  // Nobody named yet: everyone at 0 is a tie with no leader, so no place is claimed ("#1, you lead" was wrong; MVP
  // test, 2026-11-14). The report then says AI named none of the tracked businesses.
  if (you.score === 0 && others.every((r) => r.score === 0)) return null;
  const ahead = others.filter((r) => r.score! > you.score!).sort((a, b) => b.score! - a.score!);
  return { place: ahead.length + 1, of: others.length + 1, leader: ahead[0] ?? null, above: ahead.at(-1) ?? null };
}
