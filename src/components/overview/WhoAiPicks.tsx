import Link from "next/link";
import { Plus } from "lucide-react";
import { cn } from "cn";
import { SiteIcon } from "@/components/app/SiteIcon";
import { STANDING_TEXT, type OverviewCompete } from "@/modules/competitors";
import { colorAt, OTHER_SERIES_COLOR } from "@/lib/series-colors";
import { PanelHead } from "./Panel";

// Your standing against that business, in the Competitors page's words: "You're behind" on a row that beats you.
const STANDING_TONE = { ahead: "text-good-text", behind: "text-mid-text", about_same: "text-muted-foreground" } as const;

/**
 * "Who AI picks most" (mockup-ui, was "Where you stand"): the top businesses by score, you among them, each in its
 * chart color with a thin bar and its standing. Sits in the Overview's main card, right of the chart.
 */
export function WhoAiPicks({ rows, lines = [] }: { rows: OverviewCompete["stand"]; lines?: OverviewCompete["lines"] }) {
  // The same color as the business's line on the chart; grey for one not drawn there.
  const color = (name: string) => {
    const i = lines.findIndex((l) => l.name === name);
    return i >= 0 ? colorAt(i) : OTHER_SERIES_COLOR;
  };
  return (
    <div className="flex min-w-0 flex-col" data-testid="where-you-stand">
      <PanelHead
        title="Who AI picks most"
        help="The share of the last 30 days' answers that named each business. Higher means AI recommends them more often."
        link={{ href: "/competitors", text: "All competitors" }}
      />
      {rows.length === 0 ? (
        <div className="flex flex-col items-start gap-2 px-[18px] py-6 text-[13px] text-muted-foreground">
          <p>Add competitors to see where you stand.</p>
        </div>
      ) : (
        <ul className="flex flex-col">
          {rows.map((r) => (
            <li
              key={r.name}
              className={cn(
                "grid grid-cols-[8px_24px_minmax(0,1fr)_auto] items-center gap-2.5 border-b border-border/60 px-[18px] py-3 last:border-b-0",
                r.isYou && "bg-primary-tint/40",
              )}
            >
              <span className="size-2 rounded-full" style={{ background: color(r.name) }} aria-hidden="true" />
              <SiteIcon domain={r.domain} name={r.name} size="sm" />
              <span className="flex min-w-0 flex-col gap-1.5">
                <span className="flex min-w-0 items-center gap-1.5 text-[13px] font-medium">
                  <span className="truncate" title={r.name}>
                    {r.name}
                  </span>
                  {r.isYou && (
                    <>
                      <span className="sr-only"> (you)</span>
                      <span className="shrink-0 rounded-sm bg-primary-tint px-1.5 text-[10.5px] leading-4 font-medium text-primary-hover" aria-hidden="true">
                        You
                      </span>
                    </>
                  )}
                </span>
                <span className="h-1 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                  <span className="block h-full rounded-full" style={{ width: `${Math.max(r.score, 1)}%`, background: color(r.name) }} />
                </span>
              </span>
              <span className="flex flex-col items-end gap-0.5 text-right">
                <strong className="text-[13.5px] font-semibold tabular-nums">{r.score}</strong>
                {r.standing && <span className={cn("text-[11px] whitespace-nowrap", STANDING_TONE[r.standing])}>{STANDING_TEXT[r.standing]}</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
      {rows.length > 0 && rows.length < 4 && (
        <Link href="/competitors/manage" className="flex items-center gap-2 border-t border-border/60 px-[18px] py-3 text-[13px] font-medium text-primary hover:underline">
          <Plus className="size-3.5" aria-hidden="true" />
          Track another competitor
        </Link>
      )}
      {rows.length > 0 && <p className="mt-auto px-[18px] pt-2 pb-3 text-[11.5px] text-text-hint">Share of answers that named each business, last 30 days.</p>}
    </div>
  );
}
