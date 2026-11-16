// Compare's tabs (dashboard redesign), shared by the page (server) and the tab bar (browser). Ids match ?tab= in
// compareHref, and old ids (why, answers, websites, fixes) still open the matching tab.
import { compareTab, type CompareTabId } from "@/lib/compare-href";

// Order set by the owner (2026-11-16). "Why ahead or behind" stays the tab a link with no ?tab= opens.
export const COMPARE_TABS: { id: CompareTabId; label: string }[] = [
  { id: "website", label: "Website" },
  { id: "google", label: "Google" },
  { id: "summary", label: "Why ahead or behind" },
  { id: "questions", label: "Questions" },
  { id: "sources", label: "Where AI looked" },
];

export type CompareTab = CompareTabId;

/** Any ?tab= value, old names included, as one of these tabs. */
export const toCompareTab = (tab: string | null | undefined): CompareTab => compareTab(tab);
