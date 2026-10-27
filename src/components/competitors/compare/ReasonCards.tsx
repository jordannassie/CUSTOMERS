import Link from "next/link";
import { ArrowRight, ThumbsUp } from "lucide-react";
import { AddToActionsButton, type AddToActionsAction } from "@/components/actions/AddToActionsButton";
import { Badge } from "@/components/ui/badge";
import type { LeadCard, ReasonCard } from "@/modules/competitors";
import type { ActionState } from "@/modules/opportunities/board/service";

const IMPACT = { high: { text: "High impact", variant: "low" }, medium: { text: "Medium impact", variant: "mid" }, low: { text: "Low impact", variant: "secondary" } } as const;

/**
 * "Why they are ahead" on Compare (dashboard redesign): one card per likely reason, biggest evidence first. The fact
 * and its answer count on the left; what to do, where, the impact and "Add to Actions" on the right.
 */
export function ReasonCards({
  name,
  businessId,
  cards,
  states,
  add,
  saved,
}: {
  name: string;
  businessId: string;
  cards: ReasonCard[];
  states: Record<string, ActionState>;
  add: AddToActionsAction;
  /** What "Add to Actions" saves, when it must differ from what is shown (Google values are never stored, D-73). */
  saved?: (card: ReasonCard) => { fact: string; whatToDo?: string };
}) {
  if (cards.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border p-5" data-testid="no-reasons">
        <p className="text-sm font-medium">{name} isn&apos;t ahead of you anywhere we can see right now</p>
        <p className="mt-1 text-sm text-muted-foreground">We flag it here as soon as AI starts naming them more than you.</p>
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
              initial={states[c.key] ?? null}
              add={add}
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
export function LeadCards({ leads }: { leads: LeadCard[] }) {
  if (leads.length === 0) return <p className="text-sm text-muted-foreground">No clear lead over them yet.</p>;
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
