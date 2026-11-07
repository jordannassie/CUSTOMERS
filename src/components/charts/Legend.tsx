import { cn } from "cn";

export type LegendItem = { label: React.ReactNode; color: string; value?: React.ReactNode; strong?: boolean };

const SWATCH = {
  line: "h-[3px] w-3.5 rounded-full",
  dot: "size-2.5 rounded-full",
  square: "size-3 rounded-[3px]",
} as const;

/** A chart's legend: a swatch and a name per series. Text stays in ink; only the swatch carries the colour. */
export function Legend({ items, shape = "dot", className }: { items: LegendItem[]; shape?: keyof typeof SWATCH; className?: string }) {
  return (
    <ul className={cn("flex flex-wrap gap-x-4 gap-y-1.5 text-[13px] text-ink-2", className)}>
      {items.map((item, i) => (
        <li key={i} className="flex items-center gap-1.5">
          <span className={cn("shrink-0", SWATCH[shape])} style={{ background: item.color }} aria-hidden="true" />
          <span className={cn(item.strong && "font-semibold text-foreground")}>{item.label}</span>
          {item.value !== undefined && <strong className="font-semibold text-foreground tabular-nums">{item.value}</strong>}
        </li>
      ))}
    </ul>
  );
}

/** The floating card every chart's hover uses: white, a 1px border, 14px corners, the float shadow. */
export function ChartTooltipCard({ title, rows, className, style }: {
  title?: React.ReactNode;
  rows: { label: React.ReactNode; value: React.ReactNode; color?: string }[];
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={cn("pointer-events-none flex min-w-[170px] flex-col gap-1.5 rounded-[14px] border border-border bg-popover px-3.5 py-3 text-[13px] shadow-float", className)}
      style={style}
    >
      {title && <span className="font-display font-semibold text-[15px]">{title}</span>}
      {rows.map((r, i) => (
        <span key={i} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-2 text-ink-2">
            {r.color && <span className="size-2 shrink-0 rounded-full" style={{ background: r.color }} aria-hidden="true" />}
            {r.label}
          </span>
          <strong className="font-semibold tabular-nums">{r.value}</strong>
        </span>
      ))}
    </div>
  );
}
