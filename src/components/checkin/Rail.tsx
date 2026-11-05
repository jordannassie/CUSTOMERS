import Link from "next/link";
import { cn } from "cn";

// Right-rail cards from the Check-in design: a white card with a title, label and value rows, and the brand-wash notice.

export function RailCard({ title, children, className, testId }: { title?: React.ReactNode; children: React.ReactNode; className?: string; testId?: string }) {
  return (
    <section className={cn("flex flex-col gap-3.5 rounded-xl bg-card p-5", className)} data-testid={testId}>
      {title ? <h2 className="text-[15px] font-semibold">{title}</h2> : null}
      {children}
    </section>
  );
}

export type StatRow = { label: React.ReactNode; value: React.ReactNode; tone?: "danger" | "brand"; testId?: string };

/** Label on the left, value on the right, a divider above each row. */
export function StatRows({ rows }: { rows: StatRow[] }) {
  return (
    <dl className="flex flex-col gap-2.5 text-sm">
      {rows.map((r, i) => (
        <div key={i} className="flex justify-between gap-3 border-t border-divider pt-2.5" data-testid={r.testId}>
          <dt className="shrink-0 text-muted-foreground">{r.label}</dt>
          {/* A long business name with no spaces wraps instead of widening the page. */}
          <dd className={cn("min-w-0 text-right font-semibold tabular-nums [overflow-wrap:anywhere]", r.tone === "danger" && "text-danger", r.tone === "brand" && "text-brand")}>{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** The brand-wash notice (trial, paused scans, a quick win). */
export function RailNotice({ title, children, action, tint = "wash", testId }: {
  title: React.ReactNode;
  children: React.ReactNode;
  action?: { label: string; href: string };
  tint?: "wash" | "soft";
  testId?: string;
}) {
  return (
    <section className={cn("flex flex-col gap-2 rounded-xl px-5 py-[18px] text-brand-ink", tint === "wash" ? "bg-brand-tint" : "bg-brand-tint-3")} data-testid={testId}>
      <h2 className="font-semibold">{title}</h2>
      <div className="text-sm leading-normal">{children}</div>
      {action ? (
        <Link href={action.href} className="text-sm font-semibold underline underline-offset-4 hover:no-underline">
          {action.label}
        </Link>
      ) : null}
    </section>
  );
}
