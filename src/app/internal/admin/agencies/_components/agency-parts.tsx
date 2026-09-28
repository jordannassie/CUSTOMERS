import { Badge } from "@/components/ui/badge";

type Variant = "good" | "mid" | "low" | "tint" | "secondary";

export const STATUS: Record<string, { label: string; variant: Variant }> = {
  trialing: { label: "On trial", variant: "tint" },
  active: { label: "Paying", variant: "good" },
  past_due: { label: "Payment failed", variant: "low" },
  canceled: { label: "Canceled", variant: "secondary" },
  suspended: { label: "Suspended", variant: "mid" },
  deleted: { label: "Deleted", variant: "low" },
};

export function StatusBadge({ status }: { status: string }) {
  const s = STATUS[status] ?? { label: status, variant: "secondary" as const };
  return <Badge variant={s.variant}>{s.label}</Badge>;
}

export function TestBadge() {
  return <Badge variant="secondary">Test</Badge>;
}

export const credits = (n: number) => n.toLocaleString("en-US");

export function usd(value: number): string {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: value > 0 && value < 10 ? 2 : 0,
    maximumFractionDigits: value < 10 ? 2 : 0,
  });
}
