import { cn } from "cn";

// One size for every admin number (Overview, Usage, agency and business detail).
export const STAT_LABEL = "text-[13px] text-muted-foreground";
export const STAT_VALUE = "text-[24px] leading-tight font-semibold tracking-[-0.02em] tabular-nums";

/** A row of numbers with hairline gaps: two across on phones, `columns` across from lg. */
export function StatGrid({ label, columns = 4, children }: { label?: string; columns?: 4 | 5; children: React.ReactNode }) {
  return (
    <dl
      aria-label={label}
      className={cn(
        "grid grid-cols-2 gap-px overflow-hidden rounded-md border border-border bg-border",
        columns === 5 ? "sm:grid-cols-3 lg:grid-cols-5" : "lg:grid-cols-4",
      )}
    >
      {children}
    </dl>
  );
}

export function StatTile({
  label,
  value,
  note,
  tone,
  children,
}: {
  label: string;
  value: React.ReactNode;
  /** A smaller line under the number, like a month-on-month change. */
  note?: React.ReactNode;
  tone?: "bad";
  /** Anything under the note, like a sparkline. */
  children?: React.ReactNode;
}) {
  return (
    <div data-figure={label} className="flex min-w-0 flex-col gap-1 bg-surface px-4 py-4">
      <dt className={STAT_LABEL}>{label}</dt>
      <dd className={cn(STAT_VALUE, tone === "bad" && "text-low-text")}>{value}</dd>
      {note && <dd className="text-[13px] text-text-hint tabular-nums">{note}</dd>}
      {children && <dd>{children}</dd>}
    </div>
  );
}
