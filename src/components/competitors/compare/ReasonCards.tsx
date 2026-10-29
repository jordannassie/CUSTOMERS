import Link from "next/link";
import { ArrowRight, ThumbsUp } from "lucide-react";
import type { MoveAction } from "@/components/actions/ActionsBoard";
import { AddToActionsButton, type AddToActionsAction } from "@/components/actions/AddToActionsButton";
import { Badge } from "@/components/ui/badge";
import type { LeadCard, LeaderRow, ReasonCard } from "@/modules/competitors";
import { toActionStatus, type ActionState } from "@/modules/opportunities/board/service";

type Standing = NonNullable<LeaderRow["standing"]>;

const IMPACT = { high: { text: "High impact", variant: "low" }, medium: { text: "Medium impact", variant: "mid" }, low: { text: "Low impact", variant: "secondary" } } as const;

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
      <div className="rounded-md border border-dashed border-border p-5" data-testid="no-reasons">
        <p className="text-sm font-medium">No answers from the last 30 days yet</p>
        <p className="mt-1 text-sm text-muted-foreground">Reasons show here after a scan.</p>
      </div>
    );
  }
  if (cards.length === 0) {
    const behind = standing === "behind";
    return (
      <div className="rounded-md border border-dashed border-border p-5" data-testid="no-reasons">
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
    <ul className="flex flex-col gap-3" data-testid="reason-cards">
      {cards.map((c) => (
        <li key={c.key} className="grid gap-4 rounded-md border border-border bg-surface p-4 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]" data-testid="reason-card">
          <div className="flex min-w-0 flex-col gap-1.5">
            <p className="flex flex-wrap items-center gap-2 text-xs">
              <Badge variant="outline">{c.tag}</Badge>
              <span className="text-muted-foreground" data-testid="reason-basis">
                {c.basis}
              </span>
            </p>
            <p className="text-sm font-semibold">{c.title}</p>
            <p className="text-[13px] text-muted-foreground">{c.fact}</p>
            {c.answersHref && (
              <Link href={c.answersHref} className="mt-1 inline-flex w-fit items-center gap-1 text-xs font-medium text-primary hover:underline">
                See the answers
                <ArrowRight className="size-3" aria-hidden="true" />
              </Link>
            )}
          </div>
          <div className="flex flex-col gap-2 rounded-md bg-muted/60 p-3" data-testid="fix-step">
            <p className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">What to do</span>
              <Badge variant={IMPACT[c.impact].variant}>{IMPACT[c.impact].text}</Badge>
            </p>
            <p className="text-[13px] leading-snug" data-testid="fix-action">
              {c.whatToDo}
            </p>
            <p className="text-xs text-muted-foreground" data-testid="fix-where">
              Where: {c.whereToApply}
            </p>
            <AddToActionsButton
              initial={states[c.key] ?? (c.fix ? { id: c.fix.id, status: toActionStatus(c.fix.status) } : null)}
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
      ))}
    </ul>
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
        <li key={l.title} className="flex items-start gap-3 rounded-md border border-border bg-surface p-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-good-bg text-good-text" aria-hidden="true">
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
