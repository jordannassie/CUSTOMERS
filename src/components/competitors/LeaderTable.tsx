import Link from "next/link";
import { cn } from "cn";
import { SiteIcon } from "@/components/app/SiteIcon";
import { CompetitorWebsite, type SaveWebsiteAction } from "./CompetitorWebsite";
import { PointsChange } from "@/components/overview/PointsChange";
import { Badge } from "@/components/ui/badge";
import { compareHref } from "@/lib/compare-href";
import { COLLECTING_TEXT, STANDING_TEXT, TABLE_MODELS, type TableRow } from "@/modules/competitors";
import { Sparkline } from "./Sparkline";

const STANDING_BADGE = { ahead: "good", behind: "mid", about_same: "secondary" } as const;

/**
 * The Competitors leaderboard as a table (dashboard redesign): rank, the top likely reason under each name, score,
 * the last 10 scans, the weekly change, each AI tool, the standing and Compare. Wide, so it scrolls inside its card
 * on a phone. Only the AI tools this business uses get a column.
 */
/**
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
  return (
    // relative: the sr-only header is absolutely placed, and would otherwise widen the whole page on a phone.
    <div className="relative -mx-6 overflow-x-auto px-6">
      <table className="w-full min-w-[860px] text-sm" data-testid="leaderboard">
        <thead className="text-left text-xs text-muted-foreground">
          <tr className="border-b border-border">
            <th className="w-10 py-2 pr-2 font-medium">#</th>
            <th className="py-2 pr-3 font-medium">Business</th>
            <th className="py-2 pr-3 text-right font-medium">Score</th>
            <th className="py-2 pr-3 font-medium">Last scans</th>
            <th className="py-2 pr-3 font-medium">Change</th>
            {tools.map((t) => (
              <th key={t.id} className="py-2 pr-3 text-right font-medium">
                {t.label}
              </th>
            ))}
            <th className="py-2 pr-3 font-medium">Status</th>
            <th className="py-2">
              <span className="sr-only">Compare</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((r) => (
            <tr key={`${r.isYou}-${r.name}`} className={cn(r.isYou && "bg-primary-tint/40")} data-you={r.isYou || undefined} data-testid="leader-row">
              <td className="py-3 pr-2 align-top text-muted-foreground tabular-nums">{r.rank ?? ""}</td>
              <td className="max-w-[300px] py-3 pr-3 align-top">
                <span className={cn("flex min-w-0 items-center gap-2 font-medium", r.isYou && "text-primary")} title={r.name}>
                  <span className="size-2.5 shrink-0 rounded-full" style={{ background: r.color }} aria-hidden="true" />
                  <SiteIcon domain={r.isYou ? ownDomain : r.domain} name={r.name} size="sm" />
                  <span className="truncate" data-testid="leader-name">{r.isYou ? `${r.name} (you)` : r.name}</span>
                </span>
                {r.note && (
                  <span className="block text-xs text-text-hint" data-testid="chain-note">
                    {r.note}
                  </span>
                )}
                {website && !r.isYou && !r.domain && r.competitorId && (
                  <div className="mt-1 pl-[3.125rem] text-xs" data-testid="leader-add-website">
                    <CompetitorWebsite businessId={website.businessId} competitorId={r.competitorId} name={r.name} current={null} save={website.save} />
                  </div>
                )}
                {r.topReason && (
                  <span className="mt-0.5 line-clamp-2 block text-xs text-muted-foreground" data-testid="top-reason">
                    {r.standing === "ahead" ? "You lead: " : "Top reason: "}
                    {r.topReason}
                  </span>
                )}
              </td>
              <td className="py-3 pr-3 text-right align-top text-base font-semibold tabular-nums">{r.score ?? <span className="text-xs font-normal text-text-hint">Next scan</span>}</td>
              <td className="py-3 pr-3 align-top">
                <Sparkline values={r.spark} you={r.isYou} color={r.color} />
              </td>
              <td className="py-3 pr-3 align-top">{r.change ? (
                  <PointsChange change={r.change} neutral={!r.isYou} />
                ) : (
                  <span className="text-xs text-text-hint">{r.changeKnown ? "No change" : "Not enough history"}</span>
                )}</td>
              {tools.map((t) => (
                <td key={t.id} className="py-3 pr-3 text-right align-top tabular-nums">
                  {r.byModel[t.id] ?? <span className="text-xs text-text-hint">Not checked</span>}
                </td>
              ))}
              <td className="py-3 pr-3 align-top">
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
              <td className="py-3 text-right align-top">
                {r.competitorId && (
                  <Link
                    href={compareHref(r.competitorId)}
                    // Each row's link says whom it compares: a list of links all named "Compare" is no help to a screen reader.
                    aria-label={`Compare with ${r.name}`}
                    className="inline-flex h-8 items-center rounded-md border border-border px-3 text-[13px] font-medium hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
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
