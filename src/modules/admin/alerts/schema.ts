import { z } from "zod";

// The checks in check_system_alerts() (migration 037, MVP_SPEC 22), and the two the background AI jobs raise
// from the app when Claude fails (D-84, modules/ai/dal.ts).
export const ALERT_KINDS = [
  "failed_scans",
  "stuck_jobs",
  "webhook_failures",
  "provider_errors",
  "negative_balances",
  "daily_ai_cost",
  "anthropic_credit",
  "ai_fallback",
  "claude_unavailable",
] as const;
export type AlertKind = (typeof ALERT_KINDS)[number];

export const resolveAlertInput = z.object({
  alertId: z.uuid(),
  reason: z.string().trim().min(3).max(500),
});
