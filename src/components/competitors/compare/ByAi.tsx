"use client";

import { cn } from "cn";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const DOT: Record<string, string> = { openai: "bg-chatgpt", anthropic: "bg-claude", perplexity: "bg-perplexity" };

type Assistant = { provider: string; assistant: string; answers: number; them: number; you: number };

const share = (n: number, of: number) => (of > 0 ? Math.round((100 * n) / of) : 0);

/**
 * The smallest of 25, 50 and 100% that fits every bar, so a 4% bar is not a sliver on a 0 to 100 scale. The axis under
 * the bars says which one is used.
 */
function scaleMax(assistants: Assistant[]): number {
  const top = Math.max(0, ...assistants.flatMap((a) => [share(a.you, a.answers), share(a.them, a.answers)]));
  return [25, 50, 100].find((m) => top <= m) ?? 100;
}

/**
 * ChatGPT, Claude and Perplexity as grouped bars: per AI, one bar for you (blue) and one for them (their colour), from
 * zero on one shared scale, each with its count written beside it ("2 of 12, 17%"). The names and numbers are written
 * out, so colour is never the only cue, and hovering a bar says it in a sentence.
 */
export function ByAi({ name, assistants, color = "var(--cd-competitor-1)" }: { name: string; assistants: Assistant[]; color?: string }) {
  const max = scaleMax(assistants);
  return (
    <figure className="m-0 flex flex-col gap-3.5" data-testid="by-ai">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-primary" aria-hidden="true" />
          You
        </span>
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="size-2 shrink-0 rounded-full" style={{ background: color }} aria-hidden="true" />
          <span className="truncate">{name}</span>
        </span>
      </div>

      <ul className="flex flex-col gap-3.5">
        {assistants.map((a) => (
          <li key={a.provider} className="flex flex-col gap-2" data-testid="by-ai-row">
            <span className="flex items-baseline justify-between gap-3">
              <span className="flex items-center gap-1.5 text-[13px] font-medium">
                <span className={cn("size-2 shrink-0 rounded-full", DOT[a.provider] ?? "bg-muted-foreground")} aria-hidden="true" />
                {a.assistant}
              </span>
              <span className="text-[11px] tabular-nums text-text-hint">{a.answers === 1 ? "1 answer" : `${a.answers} answers`}</span>
            </span>
            {a.answers === 0 ? (
              <span className="text-xs text-muted-foreground">No answers from {a.assistant} in the last 30 days.</span>
            ) : (
              <span className="flex flex-col gap-1.5">
                <Bar assistant={a.assistant} who="You" n={a.you} of={a.answers} max={max} you />
                <Bar assistant={a.assistant} who={name} n={a.them} of={a.answers} max={max} color={color} />
              </span>
            )}
          </li>
        ))}
      </ul>

      <div className={cn(ROW, "text-[11px] tabular-nums text-text-hint")} aria-hidden="true">
        <span />
        <span className="flex justify-between">
          <span>0%</span>
          <span>{max / 2}%</span>
          <span>{max}%</span>
        </span>
        <span />
      </div>
      <figcaption className="sr-only">Share of each AI&apos;s answers that named each of you, last 30 days.</figcaption>
    </figure>
  );
}

/** Label, bar, count: the same three columns on every row, so the bars share one left edge and one scale. */
const ROW = "grid grid-cols-[4.5rem_minmax(0,1fr)_5.75rem] items-center gap-2.5 sm:grid-cols-[7rem_minmax(0,1fr)_6rem]";

function Bar({ assistant, who, n, of, max, you = false, color }: { assistant: string; who: string; n: number; of: number; max: number; you?: boolean; color?: string }) {
  const pct = share(n, of);
  const width = Math.min(100, (pct / max) * 100);
  const sentence = `${assistant} named ${you ? "you" : who} in ${n} of ${of} answers (${pct}%)`;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span tabIndex={0} className={cn(ROW, "rounded-xs outline-none focus-visible:ring-3 focus-visible:ring-ring/50")} aria-label={sentence}>
          <span className={cn("truncate text-xs", you ? "font-medium text-foreground" : "text-muted-foreground")} title={who}>
            {who}
          </span>
          <span className="relative h-2 rounded-full bg-muted" aria-hidden="true">
            {/* Grows from zero; a count above zero always shows a sliver, and zero shows the empty track. */}
            {n > 0 && (
              <span
                className={cn("absolute inset-y-0 left-0 rounded-full", you && "bg-primary")}
                style={{ width: `max(${width}%, 4px)`, ...(you ? {} : { background: color }) }}
              />
            )}
          </span>
          <span className="text-right text-xs tabular-nums">
            <span className="font-medium text-foreground">
              {n} of {of}
            </span>{" "}
            <span className="text-text-hint">({pct}%)</span>
          </span>
        </span>
      </TooltipTrigger>
      <TooltipContent side="top">{sentence}</TooltipContent>
    </Tooltip>
  );
}
