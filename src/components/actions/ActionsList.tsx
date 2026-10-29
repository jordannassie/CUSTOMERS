"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { cn } from "cn";
import { GoogleAttribution } from "@/components/onboarding/PlaceBits";
import { CopyButton } from "@/components/opportunities/CopyButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LocalDate } from "@/components/ui/local-date";
import { compareHref } from "@/lib/compare-href";
import { fixCardId } from "@/lib/fix-where";
import { STATUS_TEXT, type ActionItem, type ActionStatus } from "@/modules/opportunities/board/service";
import { IMPACT, Moves, SHORT_DAY } from "./ActionCard";

const ORDER: ActionStatus[] = ["todo", "in_progress", "suggested", "done", "dismissed"];
const STATUS_BADGE: Record<ActionStatus, "tint" | "secondary" | "good" | "mid" | "outline"> = {
  suggested: "outline",
  todo: "tint",
  in_progress: "mid",
  done: "good",
  dismissed: "secondary",
};

/**
 * The list view of Actions (dashboard redesign): one full-width table, a row per fix, To do first. Each row says the
 * impact, the fix and the fact behind it, where to apply it, its column and date, and the moves that fit; the title
 * opens the steps in place. On a phone the columns stack inside each row.
 */
export function ActionsList({
  items,
  busy,
  pickedId,
  onMove,
  onAssign,
  readOnly = false,
}: {
  items: ActionItem[];
  busy: string | null;
  pickedId: string | null;
  onMove: (item: ActionItem, status: ActionStatus) => void;
  onAssign: (item: ActionItem, toMe: boolean) => void;
  readOnly?: boolean;
}) {
  const [open, setOpen] = useState<string | null>(pickedId);
  const rows = ORDER.flatMap((status) => items.filter((i) => i.status === status));
  if (rows.length === 0) return <p className="text-sm text-muted-foreground">No actions match these filters.</p>;
  return (
    <div className="overflow-hidden rounded-md border border-border bg-surface" data-testid="action-list">
      <div className="hidden grid-cols-[5.5rem_minmax(0,1fr)_minmax(0,13rem)_7rem_4.5rem_11rem] gap-4 border-b border-border bg-muted/50 px-4 py-2 text-xs font-medium text-muted-foreground lg:grid">
        <span>Impact</span>
        <span>Fix</span>
        <span>Where to apply</span>
        <span>Status</span>
        <span>Added</span>
        <span className="text-right">
          <span className="sr-only">Actions</span>
        </span>
      </div>
      <ul className="divide-y divide-border">
        {rows.map((item) => {
          const expanded = open === item.id;
          return (
              <li
                key={item.id}
                id={fixCardId(item.id)}
                className={cn("scroll-mt-24 px-4 py-3", pickedId === item.id && "animate-fix-pulse bg-primary-tint/40")}
                data-testid="opportunity"
                data-status={item.status}
                data-picked={pickedId === item.id || undefined}
              >
                <div className="grid gap-x-4 gap-y-2 lg:grid-cols-[5.5rem_minmax(0,1fr)_minmax(0,13rem)_7rem_4.5rem_11rem] lg:items-start">
                  {/* On a phone the impact, column and date share one line above the fix. */}
                  <span className="flex flex-wrap items-center gap-1.5">
                    <Badge variant={IMPACT[item.impact].variant}>{IMPACT[item.impact].text}</Badge>
                    <Badge variant={STATUS_BADGE[item.status]} className="lg:hidden">
                      {STATUS_TEXT[item.status]}
                    </Badge>
                    <span className="text-xs text-muted-foreground tabular-nums lg:hidden"><LocalDate iso={item.completedAt ?? item.createdAt} options={SHORT_DAY} /></span>
                  </span>
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <button
                      type="button"
                      aria-expanded={expanded}
                      onClick={() => setOpen(expanded ? null : item.id)}
                      className="flex items-start gap-1.5 text-left text-sm font-semibold outline-none hover:underline focus-visible:underline"
                    >
                      <ChevronDown className={cn("mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform", expanded && "rotate-180")} aria-hidden="true" />
                      {item.title}
                    </button>
                    {item.evidence && <p className="line-clamp-2 pl-5.5 text-xs text-muted-foreground">{item.evidence.split("\n")[0]}</p>}
                  </div>
                  <span className="truncate text-[13px] font-medium text-primary-hover" title={item.whereToApply} data-testid="action-where">
                    <span className="text-muted-foreground lg:hidden">Where: </span>
                    {item.whereToApply}
                  </span>
                  <span className="hidden lg:block">
                    <Badge variant={STATUS_BADGE[item.status]}>{STATUS_TEXT[item.status]}</Badge>
                  </span>
                  <span className="hidden text-xs text-muted-foreground tabular-nums lg:block"><LocalDate iso={item.completedAt ?? item.createdAt} options={SHORT_DAY} /></span>
                  <div className="flex flex-wrap items-center gap-1.5 lg:justify-end">
                    {readOnly ? null : item.status === "suggested" ? (
                      <>
                        <Button type="button" size="sm" variant="outline" disabled={busy === item.id} onClick={() => onMove(item, "dismissed")}>
                          Dismiss
                        </Button>
                        <Button type="button" size="sm" disabled={busy === item.id} onClick={() => onMove(item, "todo")} data-testid="accept-action">
                          Accept
                        </Button>
                      </>
                    ) : (
                      <Moves item={item} busy={busy === item.id} onMove={(s) => onMove(item, s)} onAssign={(m) => onAssign(item, m)} />
                    )}
                  </div>
                </div>
                {expanded && (
                  <div className="mt-3 flex flex-col gap-3 border-t border-border pt-3 text-[13px] lg:ml-[calc(5.5rem+1rem)]">
                    {item.evidence && <p className="whitespace-pre-line">{item.evidence}</p>}
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
                    {item.whyItMatters && <p className="text-muted-foreground">{item.whyItMatters}</p>}
                    {item.steps.length > 0 && (
                      <ol className="flex list-decimal flex-col gap-1 pl-5 marker:text-muted-foreground">
                        {item.steps.map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ol>
                    )}
                    <div className="flex flex-wrap items-center gap-3">
                      {item.claudePrompt && (
                        <CopyButton text={item.claudePrompt} label="Copy prompt for Claude" copiedNote="Prompt copied. Paste it into Claude to get a draft." />
                      )}
                      {item.about.map((c) => (
                        <Link key={c.id} href={compareHref(c.id)} className="text-xs text-primary hover:underline">
                          Compare with {c.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </li>
          );
        })}
      </ul>
    </div>
  );
}
