// What each logged admin change did, and why one did not go through, in plain words from the row's details (admin
// audit 2026-11-12: rows said "Updated a lead" with no word of what changed, and failures gave no reason). Pure.

type Details = Record<string, unknown>;

const asDetails = (details: unknown): Details =>
  details && typeof details === "object" && !Array.isArray(details) ? (details as Details) : {};

/** A text field from a row's details, or null. */
export function detailText(details: unknown, key: string): string | null {
  const value = asDetails(details)[key];
  return typeof value === "string" && value ? value : null;
}

/** "in_progress" to "In progress". */
function statusWord(status: string): string {
  const words = status.replace(/[._]+/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

const credits = (n: number) => `${Math.abs(n).toLocaleString("en-US")} ${Math.abs(n) === 1 ? "credit" : "credits"}`;

/** Each part of a lead update, in the order an admin would say them. */
function leadChanges(d: Details): string[] {
  const parts: string[] = [];
  if (typeof d.status === "string") parts.push(`changed status to ${statusWord(d.status)}`);
  if (d.mark_read === true) parts.push("marked as read");
  if (d.mark_unread === true) parts.push("marked as unread");
  if (d.replied === true) parts.push("marked as replied");
  if (d.replied === false) parts.push("marked as not replied");
  if ("handled_by" in d) parts.push(typeof d.handled_by === "string" && d.handled_by ? `assigned to ${d.handled_by}` : "unassigned");
  if (d.notes_changed === true) parts.push("changed the notes");
  return parts;
}

/** One line on what changed, or null when the action name already says it all. */
export function describeChange(action: string, details: unknown): string | null {
  const d = asDetails(details);
  let parts: string[] = [];
  switch (action) {
    case "lead.update":
      parts = leadChanges(d);
      break;
    case "feature_request.update":
      if (typeof d.status === "string") parts = [`changed status to ${statusWord(d.status)}`];
      break;
    case "agency.adjust_credits":
      if (typeof d.delta === "number" && d.delta !== 0) parts = [`${d.delta > 0 ? "added" : "removed"} ${credits(d.delta)}`];
      break;
    case "agency.mark_test":
      if (typeof d.is_test === "boolean") parts = [d.is_test ? "test flag turned on" : "test flag turned off"];
      break;
    case "agency.extend_trial":
      if (typeof d.days === "number") parts = [`added ${d.days} ${d.days === 1 ? "day" : "days"}`];
      break;
    case "stripe.topup_refund":
      if (typeof d.removed === "number") {
        const spent = typeof d.credits === "number" ? d.credits - d.removed : 0;
        parts = [`took back ${credits(d.removed)}${spent > 0 ? `, ${credits(spent)} already used` : ""}`];
      }
      break;
  }
  if (parts.length === 0) return null;
  const line = parts.join(", ");
  return line.charAt(0).toUpperCase() + line.slice(1);
}

// The short codes and notes actions store when nothing changed (agency, business, scan, alert and lead actions).
const REFUSALS: Record<string, string> = {
  not_failed: "The scan had not failed, or was already retried.",
  business_busy: "The business already had a scan waiting or running.",
  business_deleted: "The business was deleted.",
  already_active: "The business already had a scan waiting or running.",
  not_found: "It could not be found. It may have been deleted.",
  deleted: "The business was deleted.",
  agency_deleted: "The account was deleted.",
  no_agency: "The business has no agency, so there were no credits to scan with.",
  not_deleted: "The business was not deleted, so there was nothing to restore.",
  too_late: "The waiting period had passed, so it could no longer be restored.",
  duplicate: "Another business in the account has the same website or Google listing.",
  "already resolved": "The alert was already resolved.",
  "status changed meanwhile": "The account's status changed in the meantime, so nothing was changed.",
  nothing: "There was nothing to change.",
  failed: "The change could not be saved.",
  "update failed": "The change could not be saved.",
};

/**
 * Why a change did not go through or was not confirmed, from the error the row stores. Known codes read in plain
 * words; anything else (a database or network message) gets a plain sentence, never the raw text.
 */
export function describeProblem(outcome: "done" | "failed" | "started", details: unknown): string | null {
  if (outcome === "done") return null;
  const error = asDetails(details).error;
  if (outcome === "started") {
    return "We could not confirm it finished, so it may have gone through only in part. Check it before trying again.";
  }
  if (typeof error === "string") {
    if (REFUSALS[error]) return REFUSALS[error];
    if (error.startsWith("Stripe refused")) return "Stripe turned down the change, so nothing was saved.";
  }
  return "Something went wrong while saving, so nothing was changed.";
}

// Alert kinds as the Overview names them.
const ALERT_KINDS: Record<string, string> = {
  failed_scans: "Failed scans alert",
  stuck_jobs: "Stuck scans alert",
  webhook_failures: "Stripe payment updates alert",
  provider_errors: "AI tool errors alert",
  negative_balances: "Negative balances alert",
  daily_ai_cost: "AI cost alert",
  anthropic_credit: "Claude out of credit alert",
  ai_fallback: "ChatGPT backup in use alert",
  claude_unavailable: "Claude unavailable alert",
  paid_not_active: "Paid but still on trial alert",
  schedule_lost: "Scheduled change lost alert",
  topup_refund_unrecovered: "Refunded credits not taken back alert",
};

/** An alert kind in plain words: "Failed scans alert", "Service check alert". */
export function alertName(kind: string | null | undefined): string {
  if (!kind) return "An alert";
  if (ALERT_KINDS[kind]) return ALERT_KINDS[kind];
  if (kind.startsWith("service_check")) return "Service check alert";
  return "An alert";
}
