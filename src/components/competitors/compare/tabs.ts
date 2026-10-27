// The comparison's tabs (B-93), shared by the page (server) and the tab bar (browser).
export const COMPARE_TABS = [
  { id: "why", label: "Why they're ahead" },
  { id: "answers", label: "AI answers" },
  { id: "websites", label: "Websites" },
  { id: "google", label: "Google" },
  { id: "fixes", label: "Fixes" },
] as const;

export type CompareTab = (typeof COMPARE_TABS)[number]["id"];

export const isCompareTab = (tab: string | null | undefined): tab is CompareTab => COMPARE_TABS.some((t) => t.id === tab);
