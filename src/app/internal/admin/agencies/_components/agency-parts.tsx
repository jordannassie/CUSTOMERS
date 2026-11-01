import { Badge } from "@/components/ui/badge";

type Variant = "good" | "mid" | "low" | "tint" | "secondary";

export const STATUS: Record<string, { label: string; variant: Variant }> = {
  trialing: { label: "On trial", variant: "tint" },
  // Display statuses (modules/admin displayStatus): a trial that never reached Stripe, or one past its end.
  trial_ended: { label: "Trial ended", variant: "mid" },
  signup_unfinished: { label: "Signup not finished", variant: "secondary" },
  active: { label: "Paying", variant: "good" },
  past_due: { label: "Payment failed", variant: "low" },
  canceled: { label: "Canceled", variant: "secondary" },
  suspended: { label: "Suspended", variant: "mid" },
  deleted: { label: "Deleted", variant: "low" },
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
