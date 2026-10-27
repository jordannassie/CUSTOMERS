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

const DOT: Record<string, string> = { openai: "bg-chatgpt", anthropic: "bg-claude", perplexity: "bg-perplexity" };

type Assistant = { provider: string; assistant: string; answers: number; them: number; you: number };

const share = (n: number, of: number) => (of > 0 ? Math.round((100 * n) / of) : 0);

/**
 * ChatGPT, Claude and Perplexity as a dumbbell chart: on one 0 to 100% scale, a dot for you (blue, round) and one for
 * them (grey, square) per AI, joined by a line as long as the gap. The line is green where you lead and amber where they
 * do, and both numbers are written beside their dots, so neither color nor shape is the only cue.
 */
export function ByAi({ name, assistants, color = "var(--cd-competitor-1)" }: { name: string; assistants: Assistant[]; color?: string }) {
  return (
    <figure className="m-0 flex flex-col gap-3" data-testid="by-ai">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-primary" aria-hidden="true" />
          You
        </span>
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="size-2.5 rounded-[2px]" style={{ background: color }} aria-hidden="true" />
          <span className="truncate">{name}</span>
        </span>
      </div>
      <ul className="flex flex-col gap-1">
        {assistants.map((a) => (
          <Dumbbell key={a.provider} a={a} name={name} color={color} />
        ))}
      </ul>
      <div className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-3 text-[11px] tabular-nums text-text-hint" aria-hidden="true">
        <span />
        <span className="flex justify-between">
          <span>0%</span>
          <span>50%</span>
          <span>100%</span>
        </span>
      </div>
      <figcaption className="text-xs text-text-hint">Share of each AI&apos;s answers that named each of you, last 30 days.</figcaption>
    </figure>
  );
}

function Dumbbell({ a, name, color }: { a: Assistant; name: string; color: string }) {
  const you = share(a.you, a.answers);
  const them = share(a.them, a.answers);
  const lo = Math.min(you, them);
  const hi = Math.max(you, them);
  const close = hi - lo < 12;
  return (
    <li
      className="grid grid-cols-[6.5rem_minmax(0,1fr)] items-center gap-3 py-2"
      aria-label={`${a.assistant}: you ${you}%, ${name} ${them}%, of ${a.answers} answers`}
    >
      <span className="flex min-w-0 flex-col">
        <span className="flex items-center gap-1.5 text-[13px] font-medium">
          <span className={cn("size-2 shrink-0 rounded-full", DOT[a.provider] ?? "bg-muted-foreground")} aria-hidden="true" />
          {a.assistant}
        </span>
        <span className="text-[11px] tabular-nums text-text-hint">{a.answers} answers</span>
      </span>
      <span className="relative h-9" aria-hidden="true">
        {/* The track and its middle mark. */}
        <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-border" />
        <span className="absolute top-1/2 left-1/2 h-2 w-px -translate-y-1/2 bg-border" />
        {/* The gap. */}
        <span
          className={cn("absolute top-1/2 h-1 -translate-y-1/2 rounded-xs", you > them ? "bg-good-text/60" : you < them ? "bg-mid-text/60" : "bg-border")}
          style={{ left: `${lo}%`, width: `${hi - lo}%` }}
        />
        <Mark at={them} value={them} square color={color} below={close && them <= you} />
        <Mark at={you} value={you} below={close && you < them} you />
      </span>
    </li>
  );
}

function Mark({
  at,
  value,
  you = false,
  square = false,
  below = false,
  color,
}: {
  at: number;
  value: number;
  you?: boolean;
  square?: boolean;
  below?: boolean;
  color?: string;
}) {
  return (
    <span className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ left: `${at}%` }}>
      <span
        className={cn(
          "block size-3 ring-2 ring-card",
          square ? "rounded-[2px]" : "rounded-full bg-primary",
          you && "relative z-10",
        )}
        style={square ? { background: color } : undefined}
      />
      <span
        className={cn(
          "absolute left-1/2 -translate-x-1/2 text-[11px] font-semibold tabular-nums whitespace-nowrap",
          below ? "top-4" : "bottom-4",
          you ? "text-primary" : "text-foreground",
        )}
      >
        {value}%
      </span>
    </span>
  );
}
