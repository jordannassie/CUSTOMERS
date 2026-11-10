import { cn } from "cn";

// Small pictures beside the admin Overview's numbers (the app Overview uses StatCards). Each one only draws the number
// next to it, so the words stay the source of truth; all are hidden from screen readers.

/** Answers that named you, as 10 squares: about how many in every 10 answers. */
export function TenSquares({ named, answers }: { named: number; answers: number }) {
  if (answers <= 0) return null;
  // At least one square for any naming at all, so a small share never reads as none.
  const filled = named === 0 ? 0 : Math.max(1, Math.round((named / answers) * 10));
  return (
    <span className="grid grid-cols-5 gap-[3px]" aria-hidden="true" data-testid="kpi-visual">
      {Array.from({ length: 10 }, (_, i) => (
        <span key={i} className={cn("size-2.5 rounded-[2px]", i < filled ? "bg-primary" : "bg-border")} />
      ))}
    </span>
  );
}

/** Your website against competitor sites (or any two counts, with `labels`): two bars on one scale. */
export function TwoBars({ yours, theirs, labels = ["You", "Rivals"] }: { yours: number; theirs: number; labels?: [string, string] }) {
  // Nothing to compare yet: no picture, so an empty tile stays clean.
  if (yours === 0 && theirs === 0) return null;
  const max = Math.max(yours, theirs, 1);
  const height = (n: number) => `${Math.max((n / max) * 100, n > 0 ? 8 : 4)}%`;
  return (
    <span className="flex items-end gap-1.5" aria-hidden="true" data-testid="kpi-visual">
      <span className="flex flex-col items-center gap-1">
        <span className="flex h-8 w-3 items-end">
          <span className="w-full rounded-t-[2px] bg-primary" style={{ height: height(yours) }} />
        </span>
        <span className="text-[10px] leading-none text-text-hint">{labels[0]}</span>
      </span>
      <span className="flex flex-col items-center gap-1">
        <span className="flex h-8 w-3 items-end">
          <span className="w-full rounded-t-[2px] bg-border" style={{ height: height(theirs) }} />
        </span>
        <span className="text-[10px] leading-none text-text-hint">{labels[1]}</span>
      </span>
    </span>
  );
}
