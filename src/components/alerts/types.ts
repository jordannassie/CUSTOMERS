import type { LucideIcon } from "lucide-react";

// One shape for every alert bell (owner, 2026-11-17: the same box for admins and customers).

/** How serious it is. Admin alerts store critical, warning and info; they read as Critical, High and Medium. */
export type AlertSeverity = "critical" | "high" | "medium";
/** New until opened in this browser, then Seen; Resolved once it was dealt with (admin alerts only). */
export type AlertStatus = "new" | "seen" | "resolved";

export type AlertLinkTo = { label: string; href: string; external?: boolean };

export type BellAlert = {
  id: string;
  severity: AlertSeverity;
  icon: LucideIcon;
  title: string;
  text: string;
  /** Short time for the list: "12:30" today, else "Nov 14". */
  when?: string;
  link?: AlertLinkTo;
  /** Dealt with already: shown under Resolved, never counted on the bell. */
  resolved?: boolean;
};

export const SEVERITY_LABEL: Record<AlertSeverity, string> = { critical: "Critical", high: "High", medium: "Medium" };
export const STATUS_LABEL: Record<AlertStatus, string> = { new: "New", seen: "Seen", resolved: "Resolved" };
export const SEVERITIES: AlertSeverity[] = ["critical", "high", "medium"];
const RANK: Record<AlertSeverity, number> = { critical: 0, high: 1, medium: 2 };

/** Open alerts before resolved ones, then the most serious first; the given order is kept within each. */
export function sortAlerts(alerts: BellAlert[]): BellAlert[] {
  return alerts
    .map((a, i) => ({ a, i }))
    .sort((x, y) => Number(!!x.a.resolved) - Number(!!y.a.resolved) || RANK[x.a.severity] - RANK[y.a.severity] || x.i - y.i)
    .map(({ a }) => a);
}
