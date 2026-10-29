"use client";

import { useState } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { cn } from "cn";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { compareHref } from "@/lib/compare-href";
import type { SiteRow } from "@/modules/sources/rows";
import { MENTIONS_LABELS, answersText, type MentionsYou } from "@/modules/sources/service";
import { AddToActionsButton, type AddToActions } from "./AddToActionsButton";
import { SiteInitial } from "./SiteInitial";
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

const MENTIONS_BADGE: Record<MentionsYou, "low" | "good" | "secondary" | "tint"> = {
  no: "low",
  sometimes: "good",
  always: "good",
  competitor: "secondary",
  own: "tint",
};

type Props = { businessId: string; rows: SiteRow[]; answers: number; add: AddToActions };

/** Every site AI used, with who used it, whether those answers named you, and what to do about it. */
export function SitesTable({ businessId, rows, answers, add }: Props) {
  const [filter, setFilter] = useState<Filter>("all");
  const [showAll, setShowAll] = useState(false);
  const matching = rows.filter(MATCH[filter]);
  const shown = showAll ? matching : matching.slice(0, FIRST_ROWS);

  return (
    <div className="flex flex-col gap-4">
      <SegmentedControl
        aria-label="Show websites"
        options={FILTERS.map((f) => ({ value: f.value, label: f.label }))}
        value={filter}
        onValueChange={(v) => setFilter(v as Filter)}
        className="max-w-full flex-wrap"
        data-testid="site-filter"
      />
      {matching.length === 0 ? (
        <p className="py-6 text-sm text-muted-foreground" data-testid="no-matching-sites">
          No websites match this filter yet.
        </p>
      ) : (
        <Table className="min-w-[980px]" data-testid="site-list">
          <TableHeader>
            <TableRow>
              <TableHead>Website</TableHead>
              <TableHead>Kind</TableHead>
              <TableHead>How often AI used it</TableHead>
              <TableHead>Used by</TableHead>
              <TableHead>Mentions you</TableHead>
              <TableHead>Businesses it names most</TableHead>
              <TableHead>
                <span className="sr-only">What to do</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shown.map((r) => (
              <TableRow key={r.host} data-testid="site-row" className={cn(r.kind === "own" && "bg-primary-tint")}>
                <TableCell className="max-w-[240px]">
                  <a
                    href={`https://${r.host}`}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="flex min-w-0 items-center gap-2 font-medium hover:text-primary hover:underline"
                  >
                    <SiteInitial host={r.host} />
                    <span className="truncate" title={r.host}>{r.host}</span>
                    <ExternalLink className="size-3.5 shrink-0 text-text-hint" aria-hidden="true" />
                    <span className="sr-only">(opens in a new tab)</span>
                  </a>
                </TableCell>
                <TableCell>
                  <Badge variant={r.kind === "own" ? "tint" : "secondary"} title={r.typeLabel} data-testid="site-kind">
                    {r.kindLabel}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="h-1.5 w-16 shrink-0 overflow-hidden rounded-xs bg-muted" aria-hidden="true">
                      <div
                        className={cn("h-full rounded-xs", r.kind === "own" ? "bg-primary" : "bg-competitor-1")}
                        style={{ width: `${Math.round((r.answers / Math.max(answers, 1)) * 100)}%` }}
                      />
                    </div>
                    <span className="whitespace-nowrap tabular-nums" data-testid="site-count">
                      {answersText(r.answers, answers)}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <ToolDots models={r.models} />
                </TableCell>
                <TableCell>
                  <Badge variant={MENTIONS_BADGE[r.mentions]} data-testid="site-mentions">
                    {MENTIONS_LABELS[r.mentions]}
                  </Badge>
                </TableCell>
                <TableCell className="max-w-[220px] truncate text-muted-foreground" title={r.names.join(", ")} data-testid="site-names">
                  {r.names.length > 0 ? r.names.join(", ") : "None named"}
                </TableCell>
                <TableCell className="text-right">
                  <RowCta row={r} businessId={businessId} add={add} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-text-hint">
        <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
          Dots: <ToolDotsKey />. Showing {shown.length} of {matching.length}.
        </span>
        {matching.length > FIRST_ROWS && (
          <Button type="button" variant="outline" size="sm" onClick={() => setShowAll((v) => !v)} data-testid="show-all-sites">
            {showAll ? "Show fewer" : "Show all"}
          </Button>
        )}
      </div>
    </div>
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
