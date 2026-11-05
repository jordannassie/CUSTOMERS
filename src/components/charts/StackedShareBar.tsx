import { cn } from "cn";
import { Legend, type LegendItem } from "./Legend";

export type ShareSegment = {
  key: string;
  /** Shown inside the segment when it is wide enough. */
  label: string;
  value: number;
  color: string;
  /** Dark text on light or warm fills, white on the brand blue and dark grey (contrast checked). */
  dark?: boolean;
};

type Props = {
  segments: ShareSegment[];
  legend: LegendItem[];
  ariaLabel: string;
  caption?: React.ReactNode;
  className?: string;
};

// Check-in mix bar (C-Sources): every use of a source as one 100% bar, coloured by what the source does for you.
export function StackedShareBar({ segments, legend, ariaLabel, caption, className }: Props) {
  const total = segments.reduce((a, s) => a + s.value, 0);
  if (total === 0) return null;
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {caption && <span className="text-[13px] text-muted-foreground">{caption}</span>}
      <div
        className="flex h-11 origin-left animate-grow-x gap-0.5 overflow-hidden rounded-[12px] [animation-delay:0.4s]"
        role="img"
        aria-label={ariaLabel}
      >
        {segments
          .filter((s) => s.value > 0)
          .map((s) => (
            <span
              key={s.key}
              title={`${s.label}, ${s.value}`}
              className={cn("flex min-w-0 items-center overflow-hidden px-2 text-xs font-semibold whitespace-nowrap", s.dark ? "text-foreground" : "text-white")}
              style={{ flex: `${s.value} 1 0`, background: s.color }}
            >
              {/* Names only where they fit: a wide enough share, and not on a phone (the legend and table name them). */}
              <span className="hidden truncate sm:inline">{s.value / total >= 0.09 ? s.label : ""}</span>
            </span>
          ))}
      </div>
      <Legend shape="square" items={legend} />
    </div>
  );
}
