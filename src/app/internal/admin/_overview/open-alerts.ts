import type { ActionResult } from "@/modules/auth";
import type { AdminOverview } from "@/modules/admin";

// The open alerts as the header's alert bell shows them (owner, 2026-11-16: the bell replaced the Overview's bar).
// Dates arrive formatted: the shared date helper lives beside server-only code.
export type AlertRowData = AdminOverview["openAlerts"][number] & {
  started: string;
  lastSeen: string;
  /** When it was last seen, short for the bell's list: "12:30" today, else "Nov 14" (UTC). */
  when: string;
  stale: boolean;
  serviceCheck: boolean;
};
export type Resolve = (input: { alertId: string; reason: string }) => Promise<ActionResult<unknown>>;
export type OverdueData = { count: number; businesses: { id: string; name: string; due: string }[] };

const KIND_LABEL: Record<string, string> = {
  failed_scans: "Failed scans",
  stuck_jobs: "Stuck scans",
  webhook_failures: "Stripe payment updates",
  provider_errors: "AI tool errors",
  negative_balances: "Negative balances",
  daily_ai_cost: "AI cost",
  anthropic_credit: "Claude out of credit",
  ai_fallback: "ChatGPT backup in use",
  claude_unavailable: "Claude unavailable",
  paid_not_active: "Paid but still on trial",
  schedule_lost: "Scheduled change lost",
  topup_refund_unrecovered: "Refunded credits not taken back",
};

/** The alert's name in plain words; a kind this page does not know is "Other alert", never its internal code. */
export function alertKindLabel(kind: string, serviceCheck: boolean): string {
  return KIND_LABEL[kind] ?? (serviceCheck ? "Service check" : "Other alert");
}
