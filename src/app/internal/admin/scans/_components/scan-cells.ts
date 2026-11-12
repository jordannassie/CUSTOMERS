import { formatDuration, type AdminScanRow } from "@/modules/admin";
import { money, plural } from "../../_components/format";

// What the Real cost and Duration cells say (admin audit 2026-11-12). Pure, so the table and the phone list agree.

export type CostCell = { text: string; muted: boolean; title?: string };

/**
 * "$0.48"; "Not recorded" when the scan ran but nothing was logged (it used to read "$0.00", which looked real);
 * "$0.00" for a test agency, which uses saved sample answers; empty (a dash) when it never ran or is still going.
 */
export function costCell(row: Pick<AdminScanRow, "hasRun" | "costUsd" | "isTest" | "status">): CostCell {
  if (row.costUsd !== null) return { text: money(row.costUsd), muted: false };
  if (!row.hasRun) return { text: "", muted: true };
  if (row.isTest) return { text: "$0.00", muted: true, title: "Test agencies use saved sample answers, so their scans cost nothing." };
  if (row.status === "running" || row.status === "queued") return { text: "", muted: true };
  return { text: "Not recorded", muted: true, title: "No AI usage was logged for this scan, so its cost is not known." };
}

/** "8 days", "5 hours", "40 minutes": how long the tries of one scan were spread over. */
export function spreadWords(ms: number): string {
  const minutes = Math.round(ms / 60_000);
  if (minutes < 60) return plural(Math.max(1, minutes), "minute", "minutes");
  const hours = Math.round(minutes / 60);
  if (hours < 48) return plural(hours, "hour", "hours");
  return plural(Math.round(hours / 24), "day", "days");
}

/**
 * "3m 26s", or for a scan tried again over days "3m 26s" and "retried over 8 days", so a scan that waited between
 * tries no longer reads as running for "7d 22h". "Tried over 8 days" when the last try's own time is not known.
 */
export function durationParts(row: Pick<AdminScanRow, "durationMs" | "retriedOverMs">): { main: string; retried: string | null } {
  if (row.retriedOverMs === null) return { main: formatDuration(row.durationMs), retried: null };
  const spread = spreadWords(row.retriedOverMs);
  if (row.durationMs === null) return { main: `Tried over ${spread}`, retried: null };
  return { main: formatDuration(row.durationMs), retried: `retried over ${spread}` };
}

/** The duration on one line: "3m 26s (retried over 8 days)". */
export function durationText(row: Pick<AdminScanRow, "durationMs" | "retriedOverMs">): string {
  const { main, retried } = durationParts(row);
  return retried ? `${main} (${retried})` : main;
}
