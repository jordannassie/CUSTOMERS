import Link from "next/link";
import { ArrowRight, ThumbsUp } from "lucide-react";
import type { MoveAction } from "@/components/actions/ActionsBoard";
import { AddToActionsButton, type AddToActionsAction } from "@/components/actions/AddToActionsButton";
import { StatusPill, type PillTone } from "@/components/checkin";
import type { LeadCard, LeaderRow, ReasonCard } from "@/modules/competitors";
import { STATUS_TEXT, toActionStatus, type ActionState, type ActionStatus } from "@/modules/opportunities/board/service";

type Standing = NonNullable<LeaderRow["standing"]>;

const IMPACT = { high: "High impact", medium: "Medium impact", low: "Low impact" } as const;
/** Check-in status pills: Suggested on the brand wash, Done on the tint, Dismissed grey. */
const PILL: Record<ActionStatus, PillTone> = { suggested: "suggested", todo: "progress", in_progress: "progress", done: "done", dismissed: "dismissed" };

/**
 * The reasons on Compare (dashboard redesign; heading by standing): one card per likely reason, biggest evidence first. The fact
 * and its answer count on the left; what to do, where, the impact and "Add to Actions" on the right. A reason a saved
 * fix already deals with says "In Actions · {status}" and links to that fix.
 */
export function ReasonCards({
  name,
  businessId,
  cards,
  states,
  add,
  saved,
  answers,
  move,
  standing = null,
}: {
  name: string;
  businessId: string;
  cards: ReasonCard[];
  states: Record<string, ActionState>;
  add: AddToActionsAction;
  /** "Move to To do" for a reason whose saved fix is still a suggestion (the scan's fix, moved, never copied). */
  move?: MoveAction;
  /** What "Add to Actions" saves, when it must differ from what is shown (Google values are never stored, D-73). */
  saved?: (card: ReasonCard) => { fact: string; whatToDo?: string };
  /** Answers from the last 30 days that this comparison is based on; with none there is nothing to say yet. */
  answers?: number;
  /** Your standing against them, so an empty list never says they aren't ahead when they are. */
  standing?: Standing | null;
}) {
  if (cards.length === 0 && answers === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border-strong p-5" data-testid="no-reasons">
        <p className="text-sm font-medium">No answers from the last 30 days yet</p>
        <p className="mt-1 text-sm text-muted-foreground">Reasons show here after a scan.</p>
      </div>
    );
  }
  if (cards.length === 0) {
    const behind = standing === "behind";
    return (
      <div className="rounded-lg border border-dashed border-border-strong p-5" data-testid="no-reasons">
        <p className="text-sm font-medium">
          {behind ? "They're ahead, but no single reason has enough answers yet to call it" : <>{name} isn&apos;t ahead of you anywhere we can see right now</>}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {behind ? "We show a reason here once more answers point to one." : "We flag it here as soon as AI starts naming them more than you."}
        </p>
      </div>
    );
  }
  return (
    <ol className="flex flex-col gap-3" data-testid="reason-cards">
      {cards.map((c) => {
        const state = states[c.key] ?? (c.fix ? { id: c.fix.id, status: toActionStatus(c.fix.status) } : null);
        return (
          <li key={c.key} className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4" data-testid="reason-card">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 flex-col gap-1">
                <p className="text-[15px] leading-snug font-semibold">{c.title}</p>
                <p className="text-sm leading-relaxed text-muted-foreground">{c.fact}</p>
              </div>
              {state && <StatusPill tone={PILL[state.status]}>{STATUS_TEXT[state.status]}</StatusPill>}
            </div>
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
              <span className="rounded-full bg-muted px-2 py-0.5 font-medium text-ink-2">{c.tag}</span>
              <span data-testid="reason-basis">{c.basis}</span>
              {c.answersHref && (
                <Link href={c.answersHref} className="inline-flex items-center gap-1 font-medium text-brand hover:underline">
                  See the answers
                  <ArrowRight className="size-3" aria-hidden="true" />
                </Link>
              )}
            </p>
            <div className="flex flex-wrap items-center gap-3 rounded-[12px] bg-muted p-3" data-testid="fix-step">
              <div className="flex min-w-0 flex-[1_1_240px] flex-col gap-1">
                <p className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-semibold text-foreground">What to do</span>
                  <span className={c.impact === "high" ? "font-semibold text-rival-ink" : "text-muted-foreground"}>{IMPACT[c.impact]}</span>
                </p>
                <p className="text-sm leading-snug" data-testid="fix-action">
                  {c.whatToDo}
                </p>
                <p className="text-xs text-muted-foreground" data-testid="fix-where">
                  Where: {c.whereToApply}
                </p>
              </div>
              <AddToActionsButton
                initial={state}
                add={add}
                move={move}
                input={{
                  businessId,
                  title: c.action.title,
                  fact: saved?.(c).fact ?? c.fact,
                  whatToDo: saved?.(c).whatToDo ?? c.whatToDo,
                  whereToApply: c.whereToApply,
                  impact: c.impact,
                  category: c.action.category,
                  source: "comparison",
                  dedupeKey: c.key,
                  evidenceData: c.action.evidenceData,
                }}
              />
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** "Where you are ahead": short cards, nothing to do but keep it up. */
export function LeadCards({ leads, standing = null }: { leads: LeadCard[]; standing?: Standing | null }) {
  if (leads.length === 0) {
    return (
      <p className="text-sm text-muted-foreground" data-testid="no-leads">
        {standing === "ahead" ? "You're ahead overall. No single reason stands out yet." : "No clear lead over them yet."}
      </p>
    );
  }
  return (
    <ul className="grid gap-3 md:grid-cols-2" data-testid="lead-cards">
      {leads.map((l) => (
        <li key={l.title} className="flex items-start gap-3 rounded-lg border border-border bg-card p-3.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-tint-2 text-brand-strong" aria-hidden="true">
            <ThumbsUp className="size-4" />
          </span>
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="text-sm font-medium">{l.title}</span>
            <span className="text-[13px] text-muted-foreground">{l.fact}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
