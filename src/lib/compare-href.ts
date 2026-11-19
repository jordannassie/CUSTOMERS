// The Compare page's address (dashboard redesign, 2026-10-27): /competitors/compare?with=<competitor id>&tab=<tab>.
// /compare itself is the public readiness check, so Compare lives under Competitors with its own sidebar item. Pure.

export const COMPARE_TABS = ["summary", "questions", "sources", "website", "google"] as const;
export type CompareTabId = (typeof COMPARE_TABS)[number];

/** Old tab names (the B-93 page) to the new ones, so old links open the matching tab. */
const OLD_TABS: Record<string, CompareTabId> = { why: "summary", answers: "questions", websites: "website", fixes: "summary" };

/** The tab a link with no ?tab= opens: the first in the owner's order, Website (owner, 2026-11-17). */
export const DEFAULT_COMPARE_TAB: CompareTabId = "website";

export function compareTab(tab: string | null | undefined): CompareTabId {
  if (!tab) return DEFAULT_COMPARE_TAB;
  if ((COMPARE_TABS as readonly string[]).includes(tab)) return tab as CompareTabId;
  return OLD_TABS[tab] ?? DEFAULT_COMPARE_TAB;
}

/** /competitors/compare?with=<id>, with the tab only when it isn't the first one. */
export function compareHref(competitorId?: string | null, tab?: string | null): string {
  const params = new URLSearchParams();
  if (competitorId) params.set("with", competitorId);
  const t = compareTab(tab);
  if (t !== DEFAULT_COMPARE_TAB) params.set("tab", t);
  const q = params.toString();
  return q ? `/competitors/compare?${q}` : "/competitors/compare";
}
