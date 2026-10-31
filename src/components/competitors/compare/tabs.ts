// Compare's tabs (dashboard redesign), shared by the page (server) and the tab bar (browser). Ids match ?tab= in
// compareHref, and old ids (why, answers, websites, fixes) still open the matching tab.
import { compareTab, type CompareTabId } from "@/lib/compare-href";

export const COMPARE_TABS: { id: CompareTabId; label: string }[] = [
  { id: "summary", label: "Why ahead or behind" },
  { id: "questions", label: "Questions" },
  { id: "sources", label: "Where AI looked" },
  { id: "website", label: "Website" },
  { id: "google", label: "Google" },
];

export type CompareTab = CompareTabId;

/** Any ?tab= value, old names included, as one of these tabs. */
export const toCompareTab = (tab: string | null | undefined): CompareTab => compareTab(tab);
