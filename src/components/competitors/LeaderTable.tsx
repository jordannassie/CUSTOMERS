import Link from "next/link";
import { MessageSquareText } from "lucide-react";
import { cn } from "cn";
import { SiteIcon } from "@/components/app/SiteIcon";
import { PointsChange } from "@/components/overview/PointsChange";
import { Badge } from "@/components/ui/badge";
import { compareHref } from "@/lib/compare-href";
import { COLLECTING_TEXT, STANDING_TEXT, TABLE_MODELS, type TableRow } from "@/modules/competitors";
import { CompetitorWebsite, type SaveWebsiteAction } from "./CompetitorWebsite";
import { HeatCell, ScoreRing } from "./Marks";
import { Sparkline } from "./Sparkline";

const STANDING_BADGE = { ahead: "good", behind: "mid", about_same: "secondary" } as const;
/** A website named in a reason ("AI used yelp.com when it picked them"), for its icon. */
const SITE_IN_TEXT = /\b((?:[a-z0-9-]+\.)+[a-z]{2,})\b/i;

const TH = "px-3 py-2.5 text-left text-xs font-medium whitespace-nowrap text-muted-foreground";
const TD = "px-3 py-3 align-middle";

/**
 * The Competitors leaderboard as a table (dashboard redesign, mockup-ui look): rank, the business, its score as a
 * ring, the last scans, the weekly change, each AI tool as a heat cell, the main likely reason, the standing and
 * Compare. Wide, so it scrolls inside its own box on a phone, never the page. Only the AI tools this business uses get
 * a column. The score stays the third cell and the standing the second to last (e2e tests read them by position).
 *
 * `ownDomain`: your business's website, for your row's icon. `website`: lets a competitor with no known website get one
 * typed in right here ("Add website", saved as your own entry, D-73), so its logo shows (2026-10-30).
 */
export function LeaderTable({
  rows,
  ownDomain = null,
  website = null,
}: {
  rows: TableRow[];
  ownDomain?: string | null;
  website?: { businessId: string; save: SaveWebsiteAction } | null;
}) {
  const tools = TABLE_MODELS.filter((m) => rows.some((r) => m.id in r.byModel));
  // With one scan every row would say "Not enough scans" and "Not enough history": those columns wait for more scans.
  const trends = rows.some((r) => r.spark.filter((v) => v !== null).length >= 2);
  const changes = rows.some((r) => r.change || r.changeKnown);
  return (
    // relative: the sr-only text is absolutely placed, and would otherwise widen the whole page on a phone.
    // No fixed min width (mockup-ui): the table fits its card, and narrower screens hide the less needed columns with
    // CSS only, so every row keeps the same cells (e2e reads Score as the 3rd cell and Status as the second to last).
    <div className="relative overflow-x-auto">
      <table className="w-full border-collapse text-[13px]" data-testid="leaderboard">
        <thead className="bg-muted">
          <tr className="border-b border-border">
            <th className={cn(TH, "hidden w-10 pr-0 sm:table-cell")}>#</th>
            <th className={TH}>Business</th>
            <th className={TH}>{trends ? "Score and last scans" : "Score"}</th>
            {changes && <th className={cn(TH, "hidden lg:table-cell")}>Change</th>}
            {tools.map((t) => (
              <th key={t.id} className={cn(TH, "hidden text-center md:table-cell lg:hidden xl:table-cell")}>
                {t.label}
              </th>
            ))}
            <th className={cn(TH, "hidden xl:table-cell")}>Main reason</th>
            <th className={cn(TH, "hidden sm:table-cell")}>Status</th>
            <th className={TH}>
              <span className="sr-only">Compare</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((r) => (
            <tr
              key={`${r.isYou}-${r.name}`}
              className={cn("transition-colors", r.isYou ? "bg-primary-tint/40" : "hover:bg-muted/40")}
              data-you={r.isYou || undefined}
              data-testid="leader-row"
            >
              <td className={cn(TD, "hidden pr-0 text-xs text-text-hint tabular-nums sm:table-cell")}>{r.rank ?? ""}</td>
              <td className={cn(TD, "max-w-[240px] min-w-[110px] sm:min-w-[150px]")}>
                <Business row={r} ownDomain={ownDomain} website={website} />
              </td>
              <td className={TD}>
                {r.score === null ? (
                  <span className="text-xs text-text-hint">Next scan</span>
                ) : (
                  <span className="flex items-center gap-2">
                    <span className="hidden sm:inline-flex">
                      <ScoreRing value={r.score} color={r.color} />
                    </span>
                    <span className="text-[15px] font-semibold tabular-nums">{r.score}</span>
                    {r.spark.filter((v) => v !== null).length >= 2 && (
                      <span className="ml-1 hidden 2xl:inline-flex">
                        <Sparkline values={r.spark} you={r.isYou} color={r.color} />
                      </span>
                    )}
                  </span>
                )}
              </td>
              {changes && (
                <td className={cn(TD, "hidden text-xs lg:table-cell")}>
                  {r.change ? (
                    <PointsChange change={r.change} neutral={!r.isYou} />
                  ) : (
                    <span className="text-xs text-text-hint">{r.changeKnown ? "No change" : "Not enough history"}</span>
                  )}
                </td>
              )}
              {tools.map((t) => (
                <td key={t.id} className={cn(TD, "hidden text-center md:table-cell lg:hidden xl:table-cell")}>
                  <HeatCell value={r.byModel[t.id]} />
                </td>
              ))}
              <td className={cn(TD, "hidden max-w-[220px] min-w-[100px] xl:table-cell")}>
                <Reason row={r} />
              </td>
              <td className={cn(TD, "hidden whitespace-nowrap sm:table-cell")}>
                {r.standing ? (
                  <Badge variant={STANDING_BADGE[r.standing]} data-testid="standing">
                    {STANDING_TEXT[r.standing]}
                  </Badge>
                ) : r.collecting ? (
                  <Badge variant="outline" data-testid="collecting">
                    {COLLECTING_TEXT}
                  </Badge>
                ) : null}
              </td>
              <td className={cn(TD, "pl-1 text-right sm:pl-3")}>
                {r.competitorId && (
                  <Link
                    href={compareHref(r.competitorId)}
                    // Each row's link says whom it compares: a list of links all named "Compare" is no help to a screen reader.
                    aria-label={`Compare with ${r.name}`}
                    className="inline-flex h-7 items-center rounded-[6px] border border-border bg-surface px-2.5 text-xs font-medium hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                    data-testid="compare-link"
                  >
                    Compare
                  </Link>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Business({
  row: r,
  ownDomain,
  website,
}: {
  row: TableRow;
  ownDomain: string | null;
  website: { businessId: string; save: SaveWebsiteAction } | null;
}) {
  const domain = r.isYou ? ownDomain : r.domain;
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <span className="size-2 shrink-0 rounded-full" style={{ background: r.color }} aria-hidden="true" />
      <SiteIcon domain={domain} name={r.name} size="sm" />
      <span className="flex min-w-0 flex-col">
        <span className={cn("truncate font-semibold", r.isYou && "text-primary")} title={r.name} data-testid="leader-name">
          {r.isYou ? `${r.name} (you)` : r.name}
        </span>
        {r.note ? (
          <span className="truncate text-[11.5px] text-text-hint" data-testid="chain-note">
            {r.note}
          </span>
        ) : domain ? (
          <span className="truncate text-[11.5px] text-text-hint">{domain}</span>
        ) : null}
        {website && !r.isYou && !r.domain && r.competitorId && (
          <span className="text-xs" data-testid="leader-add-website">
            <CompetitorWebsite businessId={website.businessId} competitorId={r.competitorId} name={r.name} current={null} save={website.save} />
          </span>
        )}
      </span>
    </div>
  );
}

/** The top likely reason, with the icon of the website it names. "You lead:" when you are ahead of them. */
function Reason({ row: r }: { row: TableRow }) {
  if (!r.topReason) return null;
  const site = r.topReason.match(SITE_IN_TEXT)?.[1] ?? null;
  const lead = r.standing === "ahead";
  return (
    <span className="flex min-w-0 items-start gap-2 text-muted-foreground">
      {site ? (
        <SiteIcon domain={site} name={site} size="sm" className="mt-px size-5" />
      ) : (
        <span className="mt-px flex size-5 shrink-0 items-center justify-center rounded-full bg-muted" aria-hidden="true">
          <MessageSquareText className="size-3" />
        </span>
      )}
      <span className="line-clamp-2 min-w-0 text-[12.5px] leading-snug" data-testid="top-reason">
        {lead ? <span className="font-medium text-good-text">You lead: </span> : <span className="sr-only">Top reason: </span>}
        {r.topReason}
      </span>
    </span>
  );
}
