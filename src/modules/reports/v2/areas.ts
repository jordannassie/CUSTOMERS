// "Where to make the changes": each place a fix is made, with its fix numbers and what changes there. Pure.
import { AREA_TEXT } from "./issue-templates";
import type { Issue } from "./issues";
import { AREA_LABELS, AREAS, type ReportSnapshot } from "./snapshot-schema";

/** One card per area the fixes touch, in a fixed order. `top` is topIssues(), so its index + 1 is the fix number. */
export function areaCards(top: Issue[]): ReportSnapshot["areas"] {
  return AREAS.flatMap((area) => {
    const fixes = top.flatMap((issue, i) => (issue.areas.includes(area) ? [i + 1] : []));
    if (fixes.length === 0) return [];
    const inArea = top.filter((issue) => issue.areas.includes(area));
    const named = [...new Set(inArea.flatMap((issue) => (issue.labels[area] ? [issue.labels[area]!] : [])))];
    // Every fix here is about one site: its own name on the card ("Foodpanda" rather than "Delivery apps").
    const single = named.length === 1 && inArea.every((issue) => issue.labels[area]) && area !== "google" && area !== "blogs" ? named[0] : null;
    const text = area === "blogs" && named.length > 0 ? `Outreach to local guides and blogs, starting with ${named[0]}.` : AREA_TEXT[area];
    return [{ area, label: single ?? AREA_LABELS[area], fixes, text }];
  });
}
