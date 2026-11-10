import { SiteIcon } from "@/components/app/SiteIcon";
import type { Site } from "@/modules/sources/service";
import { CardHead } from "./SectionCard";

const TOP = 7;

type Props = { sites: Site[]; answers: number };

const pct = (n: number, total: number) => Math.round((n / Math.max(total, 1)) * 100);

/**
 * The top card: the websites AI used most, each bar split into answers that named you and answers that did not, with
 * the count and its share of all answers. (A second "Share of answers" list repeated the same sites; removed 2026-11-10.)
 */
export function TopSites({ sites, answers }: Props) {
  const top = [...sites].sort((a, b) => b.answers - a.answers).slice(0, TOP);
  const max = Math.max(...top.map((s) => s.answers), 1);
  return (
    <section className="min-w-0 overflow-hidden rounded-lg border border-border bg-surface" data-testid="top-sites">
      <div className="flex min-w-0 flex-col">
        <CardHead title="Websites AI used most" aside={<Legend />} />
        <ul className="flex flex-col gap-3.5 px-4 py-4 sm:px-4">
          {top.map((s) => {
            const named = s.answers - s.answersWithoutYou;
            return (
              <li key={s.host} className="grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)_3.5rem] items-center gap-3 text-[13px] sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)_4.5rem]">
                <span className="flex min-w-0 items-center gap-2">
                  <SiteIcon domain={s.host} name={s.host} size="sm" />
                  <span className="truncate" title={s.host}>{s.host}</span>
                </span>
                <span className="flex h-2.5 overflow-hidden rounded-xs" style={{ width: `${(s.answers / max) * 100}%` }} aria-hidden="true">
                  {named > 0 && <span className="h-full bg-primary" style={{ width: `${(named / s.answers) * 100}%` }} />}
                  {s.answersWithoutYou > 0 && <span className="h-full flex-1 bg-competitor-3" />}
                </span>
                <span className="text-right font-medium whitespace-nowrap tabular-nums">
                  {s.answers}
                  <span className="sr-only">
                    {" "}
                    {s.answers === 1 ? "answer" : "answers"}, {named} named you,
                  </span>
                  <span className="ml-1.5 hidden text-xs font-normal text-text-hint sm:inline">{pct(s.answers, answers)}%</span>
                </span>
              </li>
            );
          })}
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
