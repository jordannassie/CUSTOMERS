import { Badge } from "@/components/ui/badge";
import type { AdminAgencyRow } from "@/modules/admin";
import { formatDate } from "../../_components/format";

// The app's pill colours (src/components/app/pills.ts): blue for what needs a look, red only for a failed payment.
type Variant = "mid" | "tint" | "secondary";

export const STATUS: Record<string, { label: string; variant: Variant }> = {
  trialing: { label: "On trial", variant: "tint" },
  // Display statuses (modules/admin displayStatus): a trial that never reached Stripe, or one past its end.
  trial_ended: { label: "Trial ended", variant: "secondary" },
  signup_unfinished: { label: "Signup not finished", variant: "secondary" },
  active: { label: "Paying", variant: "secondary" },
  past_due: { label: "Payment failed", variant: "mid" },
  canceled: { label: "Canceled", variant: "secondary" },
  suspended: { label: "Suspended", variant: "mid" },
  deleted: { label: "Deleted", variant: "secondary" },
};

// A business's own plan (business_subscriptions.status), which has a few more states than the agency.
const PLAN_STATUS: Record<string, string> = {
  none: "No plan",
  beta: "Beta",
  trialing: "On trial",
  active: "Active",
  past_due: "Payment failed",
  canceled: "Canceled",
  inactive: "Inactive",
};

export const planStatusLabel = (status: string) => PLAN_STATUS[status] ?? status.replace(/_/g, " ");

export const agencyStatusLabel = (status: string) => STATUS[status]?.label ?? status.replace(/_/g, " ");

export function StatusBadge({ status }: { status: string }) {
  const s = STATUS[status] ?? { label: status, variant: "secondary" as const };
  return <Badge variant={s.variant}>{s.label}</Badge>;
}

export const credits = (n: number) => n.toLocaleString("en-US");

/**
 * "Ends Nov 20, 2026 UTC" for a running trial, "Ended Oct 27, 2026 UTC" for one past its end; null when the agency is
 * not on a trial. The same rule on phones and desktop.
 */
export function trialText(row: Pick<AdminAgencyRow, "status" | "displayStatus" | "trialEndsAt">): string | null {
  if (row.status !== "trialing" || !row.trialEndsAt) return null;
  return `${row.displayStatus === "trial_ended" ? "Ended" : "Ends"} ${formatDate(row.trialEndsAt)}`;
}

/** The hint under the status: until when a deleted agency can come back, or that Stripe has never seen it. */
export function statusNote(row: Pick<AdminAgencyRow, "restoreUntil" | "stripeLinked">): string | null {
  if (row.restoreUntil) return `Restorable until ${formatDate(row.restoreUntil)}`;
  return row.stripeLinked ? null : "Not linked to Stripe";
}
