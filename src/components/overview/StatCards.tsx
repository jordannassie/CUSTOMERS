import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "cn";

// The three cards beside the Overview's score (mockup-ui, the owner's pick): an icon in a tinted square, the label, the
// value and one line under it, and since 2026-11-10 a small picture of the same number on the right (90px). Plain SVG
// and divs on the design tokens, every number from props, an empty state each. The pictures repeat the words, so they
// are hidden from screen readers.

/**
 * One card: icon, label, value, the line under it, and the picture on the right. `stacked` puts the picture under the
 * words and drops the icon, for a narrow column (the home page hero's three cards side by side).
 */
export function StatRow({
  icon: Icon,
  label,
  value,
  sub,
  visual,
  testId,
  stacked = false,
}: {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  visual?: ReactNode;
  testId?: string;
  stacked?: boolean;
}) {
  if (stacked) {
    return (
      <div className="flex min-w-0 flex-col items-start gap-2 bg-surface px-4 py-3" data-testid={testId}>
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-xs text-muted-foreground">{label}</span>
          <span className="text-xl leading-tight font-semibold tracking-[-0.02em] tabular-nums">{value}</span>
          {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
        </div>
        {visual && (
          <div className="flex w-full items-center" aria-hidden="true" data-testid="kpi-visual">
            {visual}
          </div>
        )}
      </div>
    );
  }
  return (
    <div className="flex min-w-0 items-center gap-3 bg-surface px-4 py-3" data-testid={testId}>
      {/* Hidden on a tablet, where the three sit side by side and the words need the room. */}
      <span className="grid size-8 shrink-0 place-items-center rounded-md bg-primary-tint text-primary sm:hidden xl:grid" aria-hidden="true">
        <Icon className="size-4" strokeWidth={1.8} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-xl leading-tight font-semibold tracking-[-0.02em] tabular-nums">{value}</span>
        {sub && <span className="flex min-w-0 flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">{sub}</span>}
      </div>
      {visual && (
        <div className="flex w-[calc(84px*var(--px,1))] shrink-0 items-center justify-end" aria-hidden="true" data-testid="kpi-visual">
          {visual}
        </div>
      )}
    </div>
  );
}

export type DonutPart = { name: string; isYou: boolean; percent: number; color: string };

const R = 20;
const C = 2 * Math.PI * R;
/** The gap between segments, in the circle's own units (a few pixels at 52px). */
const GAP = 1.6;

/** Where each segment starts and how long it is along the circle, with a small gap after each; zero shares drop out. */
export function donutSegments(parts: DonutPart[]): { part: DonutPart; length: number; offset: number }[] {
  const shown = parts.filter((p) => p.percent > 0);
  const total = shown.reduce((sum, p) => sum + p.percent, 0);
  if (total <= 0) return [];
  const gap = shown.length > 1 ? GAP : 0;
  let start = 0;
  return shown.map((part) => {
    const span = (part.percent / total) * C;
    const segment = { part, length: Math.max(span - gap, 0.5), offset: start };
    start += span;
    return segment;
  });
}

/** Share of AI picks: a 52px donut, one segment per business in its chart colour (you in blue), your share in the middle. */
export function ShareDonut({ parts, percent }: { parts: DonutPart[]; percent: number | null }) {
  const segments = donutSegments(parts);
  return (
    <span className="relative inline-grid size-[calc(52px*var(--px,1))] shrink-0 place-items-center">
      <svg viewBox="0 0 52 52" className="absolute inset-0 size-full -rotate-90">
        <circle cx="26" cy="26" r={R} fill="none" strokeWidth="7" className="stroke-muted" />
        {segments.map(({ part, length, offset }) => (
          <circle
            key={part.name}
            cx="26"
            cy="26"
            r={R}
            fill="none"
            strokeWidth="7"
            strokeDasharray={`${length} ${C - length}`}
            strokeDashoffset={-offset}
            style={{ stroke: part.isYou ? "var(--chart-1)" : part.color }}
          />
        ))}
      </svg>
      <span className="relative text-[length:calc(11px*var(--px,1))] font-semibold tabular-nums">{percent === null ? "" : `${percent}%`}</span>
    </span>
  );
}

const DOT_COLUMNS = 12;
const MAX_DOTS = 60;

/** One dot per answer up to 60; past that each dot stands for ceil(total / 60) answers. Any naming fills a dot. */
export function dotScale(named: number, total: number): { per: number; dots: number; filled: number } {
  if (total <= 0) return { per: 1, dots: 0, filled: 0 };
  const per = total > MAX_DOTS ? Math.ceil(total / MAX_DOTS) : 1;
  const dots = Math.ceil(total / per);
  const filled = named <= 0 ? 0 : Math.min(dots, Math.max(1, Math.round(named / per)));
  return { per, dots, filled };
}

/** Answers that named you: 12 columns of 5px dots, the named ones blue. */
export function AnswerDots({ named, total }: { named: number; total: number }) {
  const { dots, filled } = dotScale(named, total);
  if (dots === 0) return null;
  return (
    <span className="grid gap-[calc(2px*var(--px,1))]" style={{ gridTemplateColumns: `repeat(${DOT_COLUMNS}, calc(5px*var(--px,1)))` }} title={`${named} of ${total} answers named you`}>
      {Array.from({ length: dots }, (_, i) => (
        <span key={i} className={cn("size-[calc(5px*var(--px,1))] rounded-full", i < filled ? "bg-primary" : "bg-border")} />
      ))}
    </span>
  );
}

/** One mini bar, its width against the larger value; a value above 0 always keeps a sliver. */
function MiniBar({ value, max, you }: { value: number; max: number; you: boolean }) {
  const width = max > 0 && value > 0 ? Math.max((value / max) * 100, 8) : 0;
  return (
    <span className="flex items-center gap-1.5">
      {/* Each bar says whose it is (audit 2026-11-12: two bare numbers read as unlabelled). */}
      <span className="w-[calc(30px*var(--px,1))] shrink-0 text-[length:calc(10.5px*var(--px,1))] text-muted-foreground">{you ? "You" : "Rivals"}</span>
      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
        <span className={cn("block h-full rounded-full", you ? "bg-primary" : "bg-muted-foreground/40")} style={{ width: `${width}%` }} />
      </span>
      <span className="w-6 text-right text-[length:calc(11px*var(--px,1))] font-medium tabular-nums">{value.toLocaleString("en-US")}</span>
    </span>
  );
}

/** Website cited by AI: You (blue) over Rivals (grey). */
export function CitationBars({ yours, theirs }: { yours: number; theirs: number }) {
  const max = Math.max(yours, theirs);
  return (
    <span className="flex w-full flex-col gap-1.5" title={`You ${yours}, rivals ${theirs}`}>
      <MiniBar value={yours} max={max} you />
      <MiniBar value={theirs} max={max} you={false} />
    </span>
  );
}

/** The line under the answers count: how many skipped you, or that none named you yet. */
export function skippedText(named: number, total: number): string {
  if (named === 0) return "Not named in any answer yet";
  const skipped = total - named;
  return `${skipped.toLocaleString("en-US")} ${skipped === 1 ? "answer" : "answers"} skipped you`;
}

/** The line under the citations count: how far behind rivals' sites, not cited yet, or ahead. */
export function citedText(yours: number, theirs: number): string {
  if (yours === 0) return "Not cited yet";
  if (yours >= theirs) return "Ahead of rivals";
  return `${Math.round(theirs / yours)}x behind rivals`;
}
