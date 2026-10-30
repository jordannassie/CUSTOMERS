import "server-only";
// The Compare page (dashboard redesign, 2026-10-27): you against any tracked competitor, every fact once, each reason
// with its fix. Reads what the Competitors page reads; Google is asked only about the two businesses shown, live (D-73).
import { compareHref } from "@/lib/compare-href";
import { colorOrder, competitorColor } from "@/lib/series-colors";
import { requestNow } from "@/lib/request-now";
import { hostOf } from "@/lib/site-type";
import { requireAgency } from "@/modules/auth";
import { isFirstScan, pairTimeline, type PairPoint } from "../charts";
import { rowName, trackedNote } from "../chain";
import { CHART_DAYS, chainNames, fetchPlaceSignals, loadCompetitorsBase } from "../dal";
import type { LeaderRow, SignalRow } from "../service";
import { buildWhyPanels, loadWhyInputs } from "../why/dal";
import type { WhyPanel } from "../why/service";
import { leadCards, reasonCards, type LeadCard, type ReasonCard } from "./cards";
import { pickerOptions, rowFor, type CompareOption } from "./options";

export type { CompareOption } from "./options";

export type Comparison = {
  businessId: string;
  businessName: string;
  /** The tracked branch for a chain row ("Bean House on 5th"), as the leaderboard names it. */
  title: string;
  /** "You track Bean House on Congress" for a chain row. */
  note: string | null;
  /** The tracked branch, as saved: Google values are this one listing's, never the whole chain's. */
  branch: string;
  standing: LeaderRow["standing"];
  /** Added partway through the 30 days, so it is not compared yet. */
  collecting: boolean;
  /** Their color, the same as on the Overview and Competitors charts. */
  color: string;
  /** 30-day scores (D-63) and the margin on yours (D-64). */
  scores: { you: number | null; them: number | null; margin: number | null };
  panel: WhyPanel;
  cards: ReasonCard[];
  leads: LeadCard[];
  /** You and them at each scan, for the trend. */
  trend: PairPoint[];
  /** The trend's only scan day is the business's first scan (bars labelled "First scan"). */
  firstScan: boolean;
  /** Asks Google for the two of you, for this view only: called only after "Show Google details" (2026-10-27). */
  loadSignals: () => Promise<SignalRow[]>;
};

export type ComparePage = {
  businessId: string;
  businessName: string;
  options: CompareOption[];
  /** Businesses AI named that you don't track, for "+ Any business AI named". */
  also: { name: string; answers: number }[];
  /** Null when no competitor is tracked yet. */
  selected: Comparison | null;
};


/** The competitor furthest ahead of you, else the strongest one: what an owner most wants to see first. */
function defaultPick(options: CompareOption[]): string | null {
  const ahead = options.filter((o) => o.standing === "behind").sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
  return (ahead[0] ?? [...options].sort((a, b) => (b.score ?? -1) - (a.score ?? -1))[0])?.id ?? null;
}

/** Null when the business is not the signed-in agency's. `competitorId` null or unknown picks the default. */
export async function getComparePage(businessId: string, competitorId: string | null): Promise<ComparePage | null> {
  const { agency } = await requireAgency({ next: compareHref(competitorId) });
  const now = requestNow();
  // Both sets of reads start together.
  const [base, inputs] = await Promise.all([
    loadCompetitorsBase(agency.id, businessId, now, { charts: true, chartDays: CHART_DAYS }),
    loadWhyInputs(agency.id, businessId, now.getTime()),
  ]);
  if (!base || !inputs) return null;
  const { view } = base;
  const panels = buildWhyPanels(inputs, chainNames(view.leaderboard));
  const order = colorOrder(view.leaderboard);
  const { options, idFor } = pickerOptions(panels, view.leaderboard, order);
  const asked = competitorId ? idFor.get(competitorId) : undefined;
  const pick = asked ?? defaultPick(options);
  const panel = panels.find((p) => p.competitorId === pick);
  const page = { businessId, businessName: view.businessName, options, also: view.also };
  if (!panel) return { ...page, selected: null };

  const row = rowFor(view.leaderboard, panel.trackedName);
  const you = view.leaderboard.find((r) => r.isYou) ?? null;
  const ownDomain = inputs.data.you.domain ? hostOf(inputs.data.you.domain) : null;
  return {
    ...page,
    selected: {
      businessId,
      businessName: view.businessName,
      title: row ? rowName(row) : panel.why.name,
      note: row ? trackedNote(row) : null,
      branch: panel.trackedName,
      standing: row?.standing ?? null,
      collecting: row?.collecting ?? false,
      color: competitorColor(order, row?.name ?? panel.trackedName),
      scores: { you: you?.score ?? null, them: row?.score ?? null, margin: view.margin },
      panel,
      cards: reasonCards(panel.why.allReasons, { id: panel.competitorId, name: panel.why.name, tracked: panel.trackedName }, ownDomain, panel.fixRefs),
      leads: leadCards(panel.why.allLeads),
      trend: pairTimeline(base.report, row?.name ?? panel.trackedName),
      firstScan: isFirstScan(base.report),
      // Only the two places on this page are looked up, live, for this view only (D-73).
      loadSignals: () => base.signals(fetchPlaceSignals, panel.competitorId),
    },
  };
}

/** The old single-competitor read, kept for callers that have one id. */
export async function getComparison(businessId: string, competitorId: string): Promise<Comparison | null> {
  const page = await getComparePage(businessId, competitorId);
  return page?.selected && page.selected.panel.competitorId === competitorId ? page.selected : null;
}
