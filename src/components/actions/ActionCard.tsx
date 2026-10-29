"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, MoreHorizontal, UserRound } from "lucide-react";
import { cn } from "cn";
import { GoogleAttribution } from "@/components/onboarding/PlaceBits";
import { CopyButton } from "@/components/opportunities/CopyButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { LocalDate } from "@/components/ui/local-date";
import { compareHref } from "@/lib/compare-href";
import { fixCardId } from "@/lib/fix-where";
import { ACTION_STATUSES, STATUS_TEXT, type ActionItem, type ActionStatus } from "@/modules/opportunities/board/service";

export const IMPACT = {
  high: { text: "High", variant: "low" },
  medium: { text: "Medium", variant: "mid" },
  low: { text: "Low", variant: "secondary" },
} as const;

/** "Oct 27", in the viewer's own time zone without a hydration mismatch (LocalDate). */
export const SHORT_DAY: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };

/**
 * One action on the board (dashboard redesign): where to apply it, the impact, the title, the fact that created it,
 * and the moves that fit its column. Opens in place for the steps; `picked` opens it from a link (?fix=<id>).
 */
export function ActionCard({
  item,
  busy,
  picked,
  onMove,
  onAssign,
  readOnly = false,
}: {
  item: ActionItem;
  busy: boolean;
  picked: boolean;
  onMove: (status: ActionStatus) => void;
  onAssign: (toMe: boolean) => void;
  /** An ended plan (MVP_SPEC 4.4): the card reads as before, with no moves. */
  readOnly?: boolean;
}) {
  const [open, setOpen] = useState(picked);
  const impact = IMPACT[item.impact];
  return (
    <article
      id={fixCardId(item.id)}
      className={cn(
        "flex scroll-mt-24 flex-col gap-2.5 rounded-md border bg-surface p-3.5",
        // The fix a link opened (?fix=): outlined and pulsing a few times, so it is easy to spot on the board.
        picked ? "animate-fix-pulse border-primary ring-2 ring-primary/20" : "border-border",
      )}
      data-testid="opportunity"
      data-status={item.status}
      data-picked={picked || undefined}
    >
      {picked && <span className="text-[11px] font-semibold tracking-wide text-primary uppercase">The fix you opened</span>}
      <div className="flex items-start justify-between gap-2">
        <span className="min-w-0 truncate text-xs font-semibold text-primary-hover" title={item.whereToApply} data-testid="action-where">
          {item.whereToApply}
        </span>
        <Badge variant={impact.variant}>{impact.text}</Badge>
      </div>
      <h3 className="text-sm leading-snug font-semibold">
        <button type="button" className="text-left outline-none hover:underline focus-visible:underline" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          {item.title}
        </button>
      </h3>
      {item.evidence && (
        <p className="rounded-sm bg-muted/60 p-2 text-xs leading-relaxed whitespace-pre-line" data-testid="action-evidence">
          {open ? item.evidence : item.evidence.split("\n")[0]}
        </p>
      )}
      {item.usesGoogle && <GoogleAttribution what="Review counts and ratings" />}
      {item.googleHidden && (
        <Link
          href={`/actions?google=1&fix=${encodeURIComponent(item.id)}`}
          scroll={false}
          className="inline-flex w-fit items-center gap-1 text-xs font-medium text-primary hover:underline"
          data-testid="show-google-numbers"
        >
          Show Google numbers
        </Link>
      )}
      {open && (item.whyItMatters || item.steps.length > 0) && (
        <div className="flex flex-col gap-2 text-[13px]">
          {item.whyItMatters && <p className="text-muted-foreground">{item.whyItMatters}</p>}
          {item.steps.length > 0 && (
            <ol className="flex list-decimal flex-col gap-1 pl-4 marker:text-muted-foreground">
              {item.steps.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ol>
          )}
        </div>
      )}
      {item.about.length > 0 && (
        <p className="text-xs text-text-hint">
          About{" "}
          {item.about.map((c, i) => (
            <span key={c.id}>
              {i > 0 && ", "}
              <Link href={compareHref(c.id)} className="text-primary hover:underline">
                {c.name}
              </Link>{" "}
              (
              <Link href={`/questions?${new URLSearchParams({ named: c.name })}`} className="text-primary hover:underline" data-testid="action-named-answers">
                see answers
              </Link>
              )
            </span>
          ))}
        </p>
      )}
      {item.status === "done" && item.completedAt && (
        <p className="text-xs text-muted-foreground" data-testid="action-done">
          Done <LocalDate iso={item.completedAt} options={SHORT_DAY} />
        </p>
      )}
      {item.claudePrompt && (
        <div className="[&_button]:w-full">
          <CopyButton text={item.claudePrompt} label="Copy prompt for Claude" copiedNote="Prompt copied. Paste it into Claude to get a draft." />
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {item.assignedToYou ? (
            <>
              <UserRound className="size-3.5" aria-hidden="true" />
              Assigned to you
            </>
          ) : (
            <LocalDate iso={item.createdAt} options={SHORT_DAY} />
          )}
        </span>
        {!readOnly && (
        <div className="flex flex-wrap items-center gap-1.5">
          {item.status === "suggested" ? (
            <>
              <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => onMove("dismissed")}>
                Dismiss
              </Button>
              <Button type="button" size="sm" disabled={busy} onClick={() => onMove("todo")} data-testid="accept-action">
                Accept
              </Button>
            </>
          ) : (
            <Moves item={item} busy={busy} onMove={onMove} onAssign={onAssign} />
          )}
        </div>
        )}
      </div>
      {open && (
        <button type="button" className="flex items-center gap-1 self-start text-xs text-muted-foreground hover:text-foreground" onClick={() => setOpen(false)}>
          <ChevronDown className="size-3.5 rotate-180" aria-hidden="true" />
          Show less
        </button>
      )}
    </article>
  );
}

export function Moves({ item, busy, onMove, onAssign }: { item: ActionItem; busy: boolean; onMove: (s: ActionStatus) => void; onAssign: (toMe: boolean) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" size="sm" variant="outline" disabled={busy} aria-label={`Move or assign ${item.title}`} data-testid="move-action">
          <MoreHorizontal aria-hidden="true" />
          Move
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {ACTION_STATUSES.filter((s) => s !== item.status && s !== "suggested").map((s) => (
          <DropdownMenuItem key={s} onSelect={() => onMove(s)}>
            Move to {STATUS_TEXT[s]}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => onAssign(!item.assignedToYou)}>{item.assignedToYou ? "Unassign me" : "Assign to me"}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
