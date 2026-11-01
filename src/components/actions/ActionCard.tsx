"use client";

import { useState } from "react";
import Link from "next/link";
import { Calendar, ChevronDown, CircleCheck, MoreHorizontal, UserRound } from "lucide-react";
import { cn } from "cn";
import { GoogleAttribution } from "@/components/onboarding/PlaceBits";
import { CopyButton } from "@/components/opportunities/CopyButton";
import { SiteIcon } from "@/components/app/SiteIcon";
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

/** The one next step a card offers as a button; every other move is in the "Move or assign" menu. */
const NEXT: Partial<Record<ActionStatus, { to: ActionStatus; text: string }>> = {
  todo: { to: "in_progress", text: "Start" },
  in_progress: { to: "done", text: "Mark done" },
};

const HOST = /^(?:[a-z0-9-]+\.)+[a-z]{2,}$/i;

/** The website whose icon marks where a fix is made: a site named by its address, Google, or the owner's own site. */
function whereDomain(item: ActionItem, siteDomain: string | null): string | null {
  if (HOST.test(item.whereToApply)) return item.whereToApply;
  if (item.place === "google_listing") return "google.com";
  if (item.place === "website" || item.place === "content") return siteDomain;
  return null;
}

/**
 * One action on the board (mockup-ui redesign): where to apply it, the impact, the title, the fact that created it
 * in two lines, and a footer with its date and the moves that fit its column. Opens in place for the steps; `picked`
 * opens it from a link (?fix=<id>).
 */
export function ActionCard({
  item,
  busy,
  picked,
  onMove,
  onAssign,
  siteDomain = null,
  readOnly = false,
}: {
  item: ActionItem;
  busy: boolean;
  picked: boolean;
  onMove: (status: ActionStatus) => void;
  onAssign: (toMe: boolean) => void;
  /** The business's own website, for the icon of fixes made there. */
  siteDomain?: string | null;
  /** An ended plan (MVP_SPEC 4.4): the card reads as before, with no moves. */
  readOnly?: boolean;
}) {
  const [open, setOpen] = useState(picked);
  const impact = IMPACT[item.impact];
  const next = NEXT[item.status];
  return (
    <article
      id={fixCardId(item.id)}
      className={cn(
        "flex scroll-mt-24 flex-col gap-2 rounded-lg border bg-surface p-3 shadow-xs",
        // The fix a link opened (?fix=): outlined and pulsing a few times, so it is easy to spot on the board.
        picked ? "animate-fix-pulse border-primary ring-2 ring-primary/20" : "border-border",
      )}
      data-testid="opportunity"
      data-status={item.status}
      data-picked={picked || undefined}
    >
      {picked && <span className="text-[11px] font-semibold tracking-wide text-primary uppercase">The fix you opened</span>}
      <div className="flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-1.5">
          <SiteIcon domain={whereDomain(item, siteDomain)} name={item.whereToApply} size="sm" className="size-5 text-[10px]" />
          <span className="min-w-0 truncate text-xs font-medium text-primary-hover" title={item.whereToApply} data-testid="action-where">
            {item.whereToApply}
          </span>
        </span>
        <Badge variant={impact.variant} className="font-medium">
          {impact.text}
        </Badge>
      </div>
      <h3 className="text-[13.5px] leading-snug font-semibold">
        <button type="button" className="text-left outline-none hover:underline focus-visible:underline" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          {item.title}
        </button>
      </h3>
      {item.evidence && (
        <p
          className={cn("text-[12.5px] leading-relaxed text-muted-foreground", open ? "whitespace-pre-line" : "line-clamp-2")}
          title={open ? undefined : item.evidence}
          data-testid="action-evidence"
        >
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
        <div className="flex flex-col gap-2 rounded-md bg-muted p-2.5 text-[13px]">
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
      {item.claudePrompt && (
        <div className="[&_button]:h-7 [&_button]:text-xs">
          <CopyButton text={item.claudePrompt} label="Copy prompt for Claude" copiedNote="Prompt copied. Paste it into Claude to get a draft." />
        </div>
      )}
      <div className="mt-0.5 flex flex-wrap items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-2 text-[11.5px] text-text-hint tabular-nums">
          {item.status === "done" && item.completedAt ? (
            <span className="flex items-center gap-1 text-good-text" data-testid="action-done">
              <CircleCheck className="size-3" aria-hidden="true" />
              Done <LocalDate iso={item.completedAt} options={SHORT_DAY} />
            </span>
          ) : (
            <span className="flex items-center gap-1">
              <Calendar className="size-3" aria-hidden="true" />
              <LocalDate iso={item.createdAt} options={SHORT_DAY} />
            </span>
          )}
          {item.assignedToYou && (
            <span className="flex items-center gap-1 rounded-sm bg-primary-tint px-1.5 py-px font-medium text-primary-hover" title="Assigned to you">
              <UserRound className="size-3" aria-hidden="true" />
              <span className="sr-only">Assigned to </span>You
            </span>
          )}
        </span>
        {!readOnly && (
          <div className="ml-auto flex items-center gap-1.5">
            {item.status === "suggested" ? (
              <>
                <Button type="button" size="xs" variant="ghost" disabled={busy} onClick={() => onMove("dismissed")}>
                  Dismiss
                </Button>
                <Button type="button" size="xs" disabled={busy} onClick={() => onMove("todo")} data-testid="accept-action">
                  Accept
                </Button>
              </>
            ) : (
              <>
                {next && (
                  <Button type="button" size="xs" variant="outline" disabled={busy} onClick={() => onMove(next.to)}>
                    {next.text}
                  </Button>
                )}
                <Moves item={item} busy={busy} onMove={onMove} onAssign={onAssign} compact />
              </>
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

/** Every other move, and assigning; `compact` shows only the dots (a board card), otherwise "Move" too (the list). */
export function Moves({
  item,
  busy,
  onMove,
  onAssign,
  compact = false,
}: {
  item: ActionItem;
  busy: boolean;
  onMove: (s: ActionStatus) => void;
  onAssign: (toMe: boolean) => void;
  compact?: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          size={compact ? "icon-xs" : "sm"}
          variant={compact ? "ghost" : "outline"}
          disabled={busy}
          aria-label={`Move or assign ${item.title}`}
          data-testid="move-action"
        >
          <MoreHorizontal aria-hidden="true" />
          {!compact && "Move"}
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
