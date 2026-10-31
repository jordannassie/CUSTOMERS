"use client";

import { useState } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { compareHref } from "@/lib/compare-href";
import type { SiteRow } from "@/modules/sources/rows";
import { MENTIONS_LABELS, answersText } from "@/modules/sources/service";
import { AddToActionsButton, type AddToActions } from "./AddToActionsButton";
import { SiteIcon } from "@/components/app/SiteIcon";
import { KindChip, MentionsChip } from "./SiteChips";
import { SectionCard } from "./SectionCard";
import { ToolDots, ToolDotsKey } from "./ToolDots";

const FIRST_ROWS = 12;

const FILTERS = [
  { value: "all", label: "All" },
  { value: "skips", label: "Skips you" },
  { value: "mentions", label: "Mentions you" },
  { value: "competitor", label: "Competitor sites" },
] as const;
type Filter = (typeof FILTERS)[number]["value"];

const MATCH: Record<Filter, (r: SiteRow) => boolean> = {
  all: () => true,
  skips: (r) => r.mentions === "no",
  mentions: (r) => r.mentions === "sometimes" || r.mentions === "always",
  competitor: (r) => r.mentions === "competitor",
};

// The table runs edge to edge in its card; the first and last columns line up with the card's header text.
const EDGE = "first:pl-4 last:pr-4 sm:first:pl-[18px] sm:last:pr-[18px]";
const KIND = "hidden xl:table-cell";
const TOOLS = "hidden min-[1360px]:table-cell";

type Props = { businessId: string; rows: SiteRow[]; answers: number; moreSites: number; add: AddToActions };

/** Every site AI used, with who used it, whether those answers named you, and what to do about it. */
export function SitesTable({ businessId, rows, answers, moreSites, add }: Props) {
  const [filter, setFilter] = useState<Filter>("all");
  const [showAll, setShowAll] = useState(false);
  const matching = rows.filter(MATCH[filter]);
  const shown = showAll ? matching : matching.slice(0, FIRST_ROWS);

  return (
    <SectionCard title="All websites AI used" aside={`Out of ${answers} ${answers === 1 ? "answer" : "answers"}.`}>
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-[18px]">
        <SegmentedControl
          aria-label="Show websites"
          options={FILTERS.map((f) => ({ value: f.value, label: f.label }))}
          value={filter}
          onValueChange={(v) => setFilter(v as Filter)}
          className="max-w-full flex-wrap"
          data-testid="site-filter"
        />
        <span className="hidden text-xs text-text-hint min-[1360px]:inline">
          <ToolDotsKey />
        </span>
      </div>
      {matching.length === 0 ? (
        <p className="border-t border-border px-4 py-6 text-[13px] text-muted-foreground sm:px-[18px]" data-testid="no-matching-sites">
          No websites match this filter yet.
        </p>
      ) : (
        // Fits its card at every width: the businesses it names always sit under the website's name, and as the card
        // narrows kind, how often and the mentions move there too, so there is never a sideways scroll.
        <Table data-testid="site-list" className="text-[13px]">
          <TableHeader className="border-t border-border">
            <TableRow className="hover:bg-transparent">
              <TableHead className={EDGE}>Website</TableHead>
              <TableHead className={KIND}>Kind</TableHead>
              <TableHead className={TOOLS}>AI tools</TableHead>
              <TableHead className="hidden xl:table-cell">Answers</TableHead>
              <TableHead className="hidden sm:table-cell">Mentions you</TableHead>
              <TableHead className={cn(EDGE, "text-right")}>Next step</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shown.map((r) => (
              <TableRow key={r.host} data-testid="site-row" className={cn("border-muted", r.kind === "own" && "bg-primary-tint/60")}>
                <TableCell className={cn(EDGE, "max-w-[220px] sm:max-w-[300px]")}>
                  <div className="flex min-w-0 items-center gap-2.5">
                    <SiteIcon domain={r.host} name={r.host} size="sm" />
                    <div className="min-w-0">
                      <a
                        href={`https://${r.host}`}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        className="group/link flex min-w-0 items-center gap-1.5 font-medium hover:text-primary"
                      >
                        <span className="truncate group-hover/link:underline" title={r.host}>{r.host}</span>
                        <ExternalLink className="size-3 shrink-0 text-text-hint" aria-hidden="true" />
                        <span className="sr-only">(opens in a new tab)</span>
                      </a>
                      {/* The businesses it names most, and the columns this width leaves out. */}
                      <p className="mt-0.5 truncate text-xs text-muted-foreground" title={r.names.join(", ")}>
                        <span className="xl:hidden">
                          {r.kindLabel} · {answersText(r.answers, answers)} ·{" "}
                        </span>
                        <span className="sm:hidden">
                          {r.mentions === "own" || r.mentions === "competitor" ? MENTIONS_LABELS[r.mentions] : `Mentions you: ${MENTIONS_LABELS[r.mentions].toLowerCase()}`} ·{" "}
                        </span>
                        {r.names.length > 0 ? (
                          <>
                            Names <span data-testid="site-names">{r.names.join(", ")}</span>
                          </>
                        ) : (
                          <span data-testid="site-names">Names no business</span>
                        )}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className={KIND}>
                  <KindChip kind={r.kind} label={r.kindLabel} title={r.typeLabel} />
                </TableCell>
                <TableCell className={TOOLS}>
                  <ToolDots models={r.models} />
                </TableCell>
                <TableCell className="hidden xl:table-cell">
                  <div className="flex items-center gap-2.5">
                    <div className="h-1.5 w-14 shrink-0 overflow-hidden rounded-xs bg-muted" aria-hidden="true">
                      <div
                        className={cn("h-full rounded-xs", r.kind === "own" ? "bg-primary" : "bg-competitor-1")}
                        style={{ width: `${Math.round((r.answers / Math.max(answers, 1)) * 100)}%` }}
                      />
                    </div>
                    <span className="whitespace-nowrap text-muted-foreground tabular-nums" data-testid="site-count">
                      <b className="font-semibold text-foreground">{r.answers}</b> of {answers} {answers === 1 ? "answer" : "answers"}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  <MentionsChip mentions={r.mentions} />
                </TableCell>
                <TableCell className={cn(EDGE, "text-right")}>
                  <RowCta row={r} businessId={businessId} add={add} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 text-xs text-text-hint sm:px-[18px]">
        <span>
          Showing {shown.length} of {matching.length}.
          {moreSites > 0 && (
            <span data-testid="more-sites">
              {" "}
              {moreSites} more {moreSites === 1 ? "site was" : "sites were"} used less often.
            </span>
          )}
        </span>
        {matching.length > FIRST_ROWS && (
          <Button type="button" variant="outline" size="sm" onClick={() => setShowAll((v) => !v)} data-testid="show-all-sites">
            {showAll ? "Show fewer" : "Show all"}
          </Button>
        )}
      </div>
    </SectionCard>
  );
}

function RowCta({ row, businessId, add }: { row: SiteRow; businessId: string; add: AddToActions }) {
  if (row.cta === "listed" && row.action) {
    return <AddToActionsButton businessId={businessId} action={row.action} inActions={row.inActions} actionId={row.actionId} add={add} label="Get listed" />;
  }
  if (row.cta === "improve" || row.cta === "compare") {
    const href = row.cta === "compare" ? compareHref(row.competitorId) : "/actions";
    return (
      <Button asChild size="sm" variant="ghost" data-testid={`cta-${row.cta}`}>
        <Link href={href}>
          {row.cta === "compare" ? "Compare" : "Improve"}
          <span className="sr-only"> {row.host}</span>
        </Link>
      </Button>
    );
  }
  return null;
}
