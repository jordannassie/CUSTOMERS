import { cn } from "cn";

/** Two bars: how often AI named them and you, out of the same answers (last 30 days). */
export function Versus({ name, them, you, answers }: { name: string; them: number; you: number; answers: number }) {
  const pct = (n: number) => (answers > 0 ? Math.max(2, Math.round((n / answers) * 100)) : 0);
  const rows = [
    { label: name, n: them, bar: "bg-competitor-1", text: "text-foreground" },
    { label: "You", n: you, bar: "bg-primary", text: "font-medium text-primary" },
  ];
  return (
    <div className="flex flex-col gap-2" data-testid="why-versus">
      {rows.map((r) => (
        <div key={r.label} className="grid grid-cols-[6.5rem_minmax(0,1fr)_auto] items-center gap-3 text-sm">
          <span className={cn("truncate", r.text)} title={r.label}>
            {r.label}
          </span>
          <span className="h-2 rounded-xs bg-muted" aria-hidden="true">
            <span className={cn("block h-full rounded-xs", r.bar)} style={{ width: `${pct(r.n)}%` }} />
          </span>
          <span className="text-[13px] tabular-nums text-muted-foreground">
            {r.n} of {answers} answers
          </span>
        </div>
      ))}
    </div>
  );
}

/** "12 vs 3": them, then you in blue. */
export function Score({ them, you }: { them: number; you: number }) {
  return (
    <span className="flex shrink-0 items-baseline gap-1.5 tabular-nums" aria-label={`Them ${them}, you ${you}`}>
      <span className="font-semibold text-foreground">{them}</span>
      <span className="text-xs text-text-hint">vs</span>
      <span className="font-semibold text-primary">{you}</span>
    </span>
  );
}
