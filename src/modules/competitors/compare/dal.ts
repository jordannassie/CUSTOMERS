import "server-only";
// The comparison page, "Bean House vs you" (/competitors/[id]): one competitor against the business, every fact once.
// Reads what the Competitors page reads; Google is asked only about the two businesses on the page, live (D-73).
import { requestNow } from "@/lib/request-now";
import { requireAgency } from "@/modules/auth";
import { chainNames, fetchPlaceSignals, loadCompetitorsBase } from "../dal";
import { rowName, trackedNote } from "../chain";
import type { LeaderRow, SignalRow } from "../service";
import { buildWhyPanels, loadWhyInputs } from "../why/dal";
import type { WhyPanel } from "../why/service";
import { pairTimeline, type PairPoint } from "../charts";

export type Comparison = {
  businessId: string;
  businessName: string;
  /** "Bean House (all locations)" for a chain row. */
  title: string;
  /** "You track Bean House on Congress" for a chain row. */
  note: string | null;
  standing: LeaderRow["standing"];
  /** Added partway through the 30 days, so it is not compared yet. */
  collecting: boolean;
  panel: WhyPanel;
  /** You and them at each scan, for the trend. */
  trend: PairPoint[];
  /** Live Google values for the two of you, for this view only. */
  signals: Promise<SignalRow[]>;
};

/** Null when the business or the competitor is not the signed-in agency's. */
export async function getComparison(businessId: string, competitorId: string): Promise<Comparison | null> {
  const { agency } = await requireAgency({ next: `/competitors/${competitorId}` });
  const now = requestNow();
  // Both sets of reads start together.
  const [base, inputs] = await Promise.all([
    loadCompetitorsBase(agency.id, businessId, now, { charts: true }),
    loadWhyInputs(agency.id, businessId, now.getTime()),
  ]);
  if (!base || !inputs) return null;
  const panels = buildWhyPanels(inputs, chainNames(base.view.leaderboard));
  const panel = panels.find((p) => p.competitorId === competitorId);
  if (!panel) return null;
  // A branch merged into its chain's row is found by the tracked names that row stands for.
  const row = base.view.leaderboard.find((r) => !r.isYou && (r.name === panel.trackedName || r.chain?.tracked.includes(panel.trackedName))) ?? null;
  // Only the two places on this page are looked up, live, for this view only (D-73).
  const signals = base.signals(fetchPlaceSignals, competitorId);
  return {
    businessId,
    businessName: base.view.businessName,
    title: row ? rowName(row) : panel.why.name,
    note: row ? trackedNote(row) : null,
    standing: row?.standing ?? null,
    collecting: row?.collecting ?? false,
    panel,
    trend: pairTimeline(base.report, row?.name ?? panel.trackedName),
    signals,
  };
}
