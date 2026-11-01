import { SiteIcon } from "@/components/app/SiteIcon";
import { OTHER_SERIES_COLOR, SERIES_COLORS } from "@/lib/series-colors";
import type { Site } from "@/modules/sources/service";
import { CardHead } from "./SectionCard";

const TOP = 7;

type Props = { sites: Site[]; answers: number };

const pct = (n: number, total: number) => Math.round((n / Math.max(total, 1)) * 100);

/** Your own site in the brand blue, the others in the chart hues by rank, grey past the fifth. */
function colors(sites: Site[]): Map<string, string> {
  const others = sites.filter((s) => s.kind !== "own");
  return new Map(sites.map((s) => [s.host, s.kind === "own" ? SERIES_COLORS[0] : (SERIES_COLORS[others.indexOf(s) + 1] ?? OTHER_SERIES_COLOR)]));
}

/**
 * The top card: the websites AI used most, each bar split into answers that named you and answers that did not,
 * and beside it each site's share of all answers.
 */
export function TopSites({ sites, answers }: Props) {
  const top = [...sites].sort((a, b) => b.answers - a.answers).slice(0, TOP);
  const max = Math.max(...top.map((s) => s.answers), 1);
  const color = colors(top);
  return (
    <section className="grid min-w-0 overflow-hidden rounded-lg border border-border bg-surface xl:grid-cols-[minmax(0,1fr)_320px]" data-testid="top-sites">
      <div className="flex min-w-0 flex-col">
        <CardHead title="Websites AI used most" aside={<Legend />} />
        {/* Spread to the height of the share list beside it, so the rows roughly line up. */}
        <ul className="flex flex-1 flex-col justify-around gap-3.5 px-4 py-4 sm:px-[18px]">
          {top.map((s) => {
            const named = s.answers - s.answersWithoutYou;
            return (
              <li key={s.host} className="grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)_2rem] items-center gap-3 text-[13px] sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)_2.5rem]">
                <span className="flex min-w-0 items-center gap-2">
                  <SiteIcon domain={s.host} name={s.host} size="sm" />
                  <span className="truncate" title={s.host}>{s.host}</span>
                </span>
                <span className="flex h-2.5 overflow-hidden rounded-xs" style={{ width: `${(s.answers / max) * 100}%` }} aria-hidden="true">
                  {named > 0 && <span className="h-full bg-primary" style={{ width: `${(named / s.answers) * 100}%` }} />}
                  {s.answersWithoutYou > 0 && <span className="h-full flex-1 bg-competitor-3" />}
                </span>
                <span className="text-right font-medium tabular-nums">
                  {s.answers}
                  <span className="sr-only">
                    {" "}
                    {s.answers === 1 ? "answer" : "answers"}, {named} named you
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      </div>
      <div className="min-w-0 border-t border-border xl:border-t-0 xl:border-l">
        <CardHead title="Share of answers" aside="Last 30 days" />
        <ul className="flex flex-col divide-y divide-muted">
          {top.map((s) => (
            <li key={s.host} className="grid grid-cols-[8px_24px_minmax(0,1fr)_auto] items-center gap-2.5 px-4 py-2.5 text-[13px] sm:px-[18px]">
              <span className="size-2 rounded-full" style={{ background: color.get(s.host) }} aria-hidden="true" />
              <SiteIcon domain={s.host} name={s.host} size="sm" />
              <span className="truncate font-medium" title={s.host}>{s.host}</span>
              <span className="flex flex-col items-end gap-px">
                <b className="font-semibold tabular-nums">{pct(s.answers, answers)}%</b>
                <small className="text-[11.5px] whitespace-nowrap text-text-hint tabular-nums">
                  {s.answers} {s.answers === 1 ? "answer" : "answers"}
                </small>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Legend() {
  return (
    <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground">
      <span className="inline-flex items-center gap-1.5">
        <span className="size-2 rounded-[2px] bg-primary" aria-hidden="true" />
        Named you
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="size-2 rounded-[2px] bg-competitor-3" aria-hidden="true" />
        Did not name you
      </span>
    </span>
  );
}
