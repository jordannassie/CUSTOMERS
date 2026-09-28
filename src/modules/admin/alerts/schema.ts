import { z } from "zod";

// The checks in check_system_alerts() (migration 037, MVP_SPEC 22).
export const ALERT_KINDS = [
  "failed_scans",
  "stuck_jobs",
  "webhook_failures",
  "provider_errors",
  "negative_balances",
  "daily_ai_cost",
] as const;
export type AlertKind = (typeof ALERT_KINDS)[number];

export const resolveAlertInput = z.object({
  alertId: z.uuid(),
  reason: z.string().trim().min(3).max(500),
});
