import { cn } from "cn";
import { colorAt } from "@/lib/series-colors";
import { Section } from "../section";
import { HeroDashboardChart, type ChartLine } from "./HeroDashboardChart";
import { ProductFrame } from "./ProductFrame";

// The live site's dashboard preview under the hero, rebuilt with the app's own chart and the made-up coffee shop
// every homepage demo uses (MVP_SPEC 12.2). Scores match DashboardPreview: Daily Grind 81, Bean House 62.
const WEEKS = ["Aug 4", "Aug 11", "Aug 18", "Aug 25", "Sep 1", "Sep 8", "Sep 15", "Sep 22", "Sep 29", "Oct 6"];

const BUSINESSES = [
  { name: "Bean House", values: [34, 38, 41, 45, 48, 52, 55, 57, 60, 62], change: 4, you: true },
  { name: "Daily Grind", values: [74, 75, 73, 76, 78, 77, 79, 80, 80, 81], change: 1 },
  { name: "Brew Lab", values: [52, 55, 54, 56, 55, 58, 57, 56, 58, 57], change: -1 },
  { name: "Cup & Co", values: [30, 28, 29, 27, 26, 25, 24, 24, 23, 22], change: -2 },
];

const LINES: ChartLine[] = BUSINESSES.map((b, i) => ({ name: b.name, values: b.values, color: colorAt(i), you: b.you }));

const SITES = [
  { site: "yelp.com", type: "Reviews and forums", answers: 14 },
  { site: "beanhouse.com", type: "Your website", answers: 9, you: true },
  { site: "reddit.com", type: "Reviews and forums", answers: 8 },
  { site: "ocfoodguide.com", type: "News", answers: 5 },
];

const TYPES = [
  { label: "Reviews and forums", share: 41 },
  { label: "Your website", share: 22, you: true },
  { label: "Directories", share: 19 },
  { label: "News", share: 11 },
  { label: "Business sites", share: 7 },
];

function Change({ points }: { points: number }) {
  const up = points > 0;
  return (
    <span className={cn("text-xs font-medium tabular-nums", up ? "text-good-text" : "text-muted-foreground")}>
      {up ? "Up" : "Down"} {Math.abs(points)}
    </span>
  );
}

function CompetitorList() {
  const ranked = [...BUSINESSES].sort((a, b) => b.values.at(-1)! - a.values.at(-1)!);
  return (
    <div className="flex flex-col">
      <p className="border-b border-border px-[calc(18px*var(--px,1))] py-3 text-[length:calc(14.5px*var(--px,1))] font-semibold">Your competitors</p>
      <ul>
        {ranked.map((b) => (
          <li
            key={b.name}
            className={cn(
              "grid grid-cols-[8px_minmax(0,1fr)_auto_52px] items-center gap-2.5 border-b border-border px-[calc(18px*var(--px,1))] py-2.5 text-[length:calc(13px*var(--px,1))]",
              b.you && "bg-primary-tint",
            )}
          >
            <span className="size-2 rounded-full" style={{ background: colorAt(BUSINESSES.indexOf(b)) }} aria-hidden="true" />
            <span className={cn("truncate font-medium", b.you && "text-primary-hover")}>{b.name}</span>
            <span className="font-semibold tabular-nums">{b.values.at(-1)}</span>
            <span className="text-right">
              <Change points={b.change} />
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SourceTypes() {
  return (
    <div className="flex flex-col gap-2.5 px-[calc(18px*var(--px,1))] py-4">
      <p className="text-[length:calc(14.5px*var(--px,1))] font-semibold">Where answers come from</p>
      <ul className="flex flex-col gap-2">
        {TYPES.map((t) => (
          <li key={t.label} className="flex flex-col gap-1 text-[length:calc(13px*var(--px,1))]">
            <span className="flex justify-between gap-2">
              <span className={cn("text-foreground", t.you && "font-medium text-primary-hover")}>{t.label}</span>
              <span className="font-semibold tabular-nums">{t.share}%</span>
            </span>
            <span className="h-1.5 overflow-hidden rounded-xs bg-muted" aria-hidden="true">
              <span className={cn("block h-full rounded-xs", t.you ? "bg-primary" : "bg-competitor-2")} style={{ width: `${t.share}%` }} />
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SitesTable() {
  return (
    <div className="border-t border-border">
      <p className="px-[calc(18px*var(--px,1))] pt-4 pb-2 text-[length:calc(14.5px*var(--px,1))] font-semibold">Sites AI leans on</p>
      <table className="w-full text-[length:calc(13px*var(--px,1))]">
        <thead>
          <tr className="border-b border-border text-left text-xs text-text-hint">
            <th className="px-[calc(18px*var(--px,1))] py-2 font-medium">Site</th>
            <th className="hidden px-2 py-2 font-medium sm:table-cell">Type</th>
            <th className="px-[calc(18px*var(--px,1))] py-2 text-right font-medium">Answers</th>
          </tr>
        </thead>
        <tbody>
          {SITES.map((s) => (
            <tr key={s.site} className={cn("border-b border-border last:border-b-0", s.you && "bg-primary-tint")}>
              <td className={cn("px-[calc(18px*var(--px,1))] py-2.5 font-medium", s.you && "text-primary-hover")}>{s.site}</td>
              <td className="hidden px-2 py-2.5 text-muted-foreground sm:table-cell">{s.type}</td>
              <td className="px-[calc(18px*var(--px,1))] py-2.5 text-right font-semibold tabular-nums">{s.answers}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** The dashboard mockup under the hero: the score over time for you and three competitors, who leads, and the sites AI uses. */
export function HeroDashboard() {
  return (
    <Section aria-label="Example dashboard" className="border-t-0 pt-0 sm:pt-0">
      <ProductFrame page="Overview" note="Last 10 weeks">
        <div className="grid lg:grid-cols-[minmax(0,1fr)_calc(300px*var(--px,1))]">
          <div className="flex min-w-0 flex-col">
            <div className="flex flex-col gap-3 px-[calc(18px*var(--px,1))] py-4">
              <div className="flex flex-col gap-1">
                <p className="text-[length:calc(14.5px*var(--px,1))] font-semibold">How often AI recommends each business</p>
                <p className="text-[length:calc(13px*var(--px,1))] text-muted-foreground">Bean House is up 28 points since August and closing on Daily Grind.</p>
              </div>
              <HeroDashboardChart
                labels={WEEKS}
                lines={LINES}
                ariaLabel="Visibility score by week for 4 coffee shops. Bean House rose from 34 to 62. Daily Grind leads at 81, Brew Lab is at 57 and Cup & Co fell to 22."
              />
            </div>
            <SitesTable />
          </div>
          <div className="flex min-w-0 flex-col border-t border-border lg:border-t-0 lg:border-l">
            <CompetitorList />
            <SourceTypes />
          </div>
        </div>
      </ProductFrame>
    </Section>
  );
}
