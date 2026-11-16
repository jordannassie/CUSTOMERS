import type { ReportSnapshot } from "../snapshot-schema";

/**
 * The PDF's rank tile. With no competitors tracked it said "Rank among tracked: None" (preview test, 2026-11-16), which
 * read like a ranking failure; it now says what is missing and where to fix it. Pure.
 */
export function rankTile(snap: Pick<ReportSnapshot, "rank" | "businesses">): { label: string; value: string; note: string } {
  const rank = snap.rank;
  const tracked = snap.businesses.filter((b) => !b.isYou).length;
  // The value stays one short word: the tile's big number has room for "None", and a longer phrase wrapped the layout.
  if (tracked === 0) return { label: "Competitors tracked", value: "None", note: "Add them in Competitors to compare" };
  if (!rank) return { label: `Rank among ${tracked + 1} tracked`, value: "None", note: "No tracked business was named" };
  const leader = rank.leader;
  const note = rank.position === 1 ? "You lead the tracked businesses" : leader ? `Leader: ${leader.name}, ${leader.score}` : "Leader not known";
  return { label: `Rank among ${rank.of} tracked`, value: `#${rank.position}`, note };
}
