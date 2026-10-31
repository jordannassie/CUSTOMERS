// One order for saved fixes on every screen (Actions board, report, weekly email): most important first, then the
// order the AI listed them in (evidence_data.rank, written when a scan saves its fixes), then newest. A fix without a
// rank (added from Compare, Sources or by hand, or saved before ranks) comes after the ranked ones of its impact. Pure.

export type FixOrderKey = { impact: string; rank?: number | null; createdAt: string };

const IMPACT_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };
// An unknown impact reads as medium, as everywhere else.
const impactOrder = (impact: string) => IMPACT_ORDER[impact] ?? 1;

/** The AI's position for this fix, from its evidence_data; null when it has none. */
export function rankOf(evidenceData: unknown): number | null {
  if (!evidenceData || typeof evidenceData !== "object" || Array.isArray(evidenceData)) return null;
  const rank = (evidenceData as Record<string, unknown>).rank;
  return typeof rank === "number" && Number.isInteger(rank) && rank >= 0 ? rank : null;
}

/** Sort comparator: impact, then rank (missing last), then newest. */
export function byImpactThenRank(a: FixOrderKey, b: FixOrderKey): number {
  const ra = a.rank ?? Number.POSITIVE_INFINITY;
  const rb = b.rank ?? Number.POSITIVE_INFINITY;
  return impactOrder(a.impact) - impactOrder(b.impact) || (ra === rb ? 0 : ra - rb) || b.createdAt.localeCompare(a.createdAt);
}
