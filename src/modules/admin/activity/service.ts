import { z } from "zod";

// The Admin activity page (admin review 2026-11-12): every admin action from admin_audit_log, in plain words. Pure.

/** What each logged action did, as the page says it. Unknown ones read from their code ("lead.update" -> "Lead update"). */
export const ACTION_LABELS: Record<string, string> = {
  "agency.adjust_credits": "Changed credits",
  "agency.extend_trial": "Extended trial",
  "agency.suspend": "Suspended",
  "agency.unsuspend": "Unsuspended",
  "agency.restore": "Restored account",
  "agency.mark_test": "Changed test flag",
  "stripe.topup_refund": "Top-up refunded in Stripe",
  "business.run_scan": "Ran a scan",
  "business.restore": "Restored business",
  "scan_job.retry": "Retried a scan",
  "system_alert.resolve": "Resolved an alert",
  "lead.update": "Updated a lead",
  "feature_request.update": "Updated a feature request",
  "app_review.approve": "Approved a review",
  "app_review.reject": "Rejected a review",
  "app_review.remove": "Removed a review",
  "app.save": "Saved an AI app",
  "app.remove": "Reset an AI app to its built-in values",
};

export function actionLabel(action: string): string {
  if (ACTION_LABELS[action]) return ACTION_LABELS[action];
  const words = action.replace(/[._]+/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** The areas to filter by: the part of an action before the dot. */
export const ACTIVITY_AREAS = ["agency", "business", "scan_job", "system_alert", "lead", "feature_request", "app_review", "app", "stripe"] as const;
export type ActivityArea = (typeof ACTIVITY_AREAS)[number];
export const AREA_LABELS: Record<ActivityArea, string> = {
  agency: "Agencies",
  business: "Businesses",
  scan_job: "Scans",
  system_alert: "Alerts",
  lead: "Leads",
  feature_request: "Feature requests",
  app_review: "App reviews",
  app: "AI apps",
  stripe: "Stripe",
};

// Like every admin list: a value that does not parse is no filter.
export const activityQuery = z.object({
  page: z.coerce.number().int().min(1).max(10_000).catch(1),
  area: z.enum(ACTIVITY_AREAS).optional().catch(undefined),
  failed: z.enum(["1"]).optional().catch(undefined),
});
export type ActivityQuery = z.infer<typeof activityQuery>;

/**
 * Where a logged change can be opened, or null when the page has nowhere to send the admin. A scan opens the Scans
 * list filtered to its business (`businessId`); a resolved alert is off the Overview, so it has no link.
 */
export function targetHref(type: string | null, id: string | null, businessId?: string | null): string | null {
  if (!id) return null;
  switch (type) {
    case "agency":
      return `/internal/admin/agencies/${id}`;
    case "business":
      return `/internal/admin/businesses/${id}`;
    case "lead":
      return `/internal/admin/leads?lead=${encodeURIComponent(id)}`;
    case "scan_job":
      return businessId ? `/internal/admin/scans?business=${encodeURIComponent(businessId)}` : null;
    case "feature_request":
      return "/internal/admin/feature-requests";
    case "app_review":
    case "review":
      return `/internal/admin/reviews?review=${encodeURIComponent(id)}`;
    case "app":
      return "/internal/admin/apps";
    default:
      return null;
  }
}

/** The reason an admin typed, from the row's details, if any. Stripe rows have none: their note is written by the app. */
export function reasonOf(details: unknown, action = ""): string | null {
  if (action.startsWith("stripe.")) return null;
  if (!details || typeof details !== "object" || Array.isArray(details)) return null;
  const reason = (details as Record<string, unknown>).reason;
  return typeof reason === "string" && reason.trim() ? reason.trim() : null;
}
