import type { SourceType } from "@/modules/sources/classify";
import { answersText, type SourcesView } from "@/modules/sources/service";

const COLOR: Record<SourceType, string> = {
  own: "var(--chart-1)",
  directories: "var(--cd-series-4)",
  reviews: "var(--cd-series-3)",
  news: "var(--cd-series-5)",
  business: "var(--cd-series-2)",
};

const R = 54;
const C = 2 * Math.PI * R;

/** How many answers leaned on each kind of site, as a donut with the answers in the middle and a legend beside it. */
export function SourceTypes({ types, answers }: { types: SourcesView["types"]; answers: number }) {
  const sum = types.reduce((n, t) => n + t.answers, 0);
  const overlap = sum > answers;
  return (
    <div className="flex flex-col gap-4 px-4 py-5 sm:px-[18px]">
      <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
        <Donut types={types} sum={sum} answers={answers} />
        <ul className="flex w-full min-w-0 flex-1 flex-col gap-3" data-testid="source-types">
          {types.map((t) => (
            // The label comes first and the answers line right after it in reading order; the percent sits top right.
            <li key={t.type} className="grid grid-cols-[8px_minmax(0,1fr)_auto] items-center gap-x-2.5 gap-y-0.5 text-[13px]">
              <span className="row-start-1 size-2 rounded-[2px]" style={{ background: COLOR[t.type] }} aria-hidden="true" />
              <span className="col-start-2 row-start-1 truncate font-medium">{t.label}</span>
              <span className="col-start-2 row-start-2 truncate text-xs text-text-hint" title={t.kinds.join(", ")}>
                {answersText(t.answers, answers)}
                <span>
                  {" "}
                  · {t.sites} {t.sites === 1 ? "site" : "sites"}
                  {t.kinds.length > 1 ? `: ${t.kinds.join(", ")}` : ""}
                </span>
              </span>
              <span className="col-start-3 row-start-1 font-semibold tabular-nums">
                {Math.round((t.answers / Math.max(answers, 1)) * 100)}%
              </span>
            </li>
          ))}
        </ul>
      </div>
      {overlap && (
        <p className="text-xs text-text-hint">One answer can use several kinds, so these add up to more than {answers}.</p>
      )}
    </div>
  );
}

function Donut({ types, sum, answers }: { types: SourcesView["types"]; sum: number; answers: number }) {
  const gap = types.length > 1 ? 3 : 0;
  const parts = types.map((t) => (t.answers / Math.max(sum, 1)) * C);
  const starts = parts.map((_, i) => parts.slice(0, i).reduce((a, b) => a + b, 0));
  return (
    <svg width="140" height="140" viewBox="0 0 140 140" className="shrink-0" aria-hidden="true">
      <circle cx="70" cy="70" r={R} fill="none" stroke="var(--muted)" strokeWidth="14" />
      {types.map((t, i) => {
        const len = Math.max(parts[i] - gap, 0.5);
        return (
          <circle
            key={t.type}
            cx="70"
            cy="70"
            r={R}
            fill="none"
            stroke={COLOR[t.type]}
            strokeWidth="14"
            strokeDasharray={`${len} ${C - len}`}
            strokeDashoffset={-starts[i]}
            transform="rotate(-90 70 70)"
          />
        );
      })}
      <text x="70" y="70" textAnchor="middle" className="fill-foreground text-[24px] font-semibold tabular-nums">
        {answers}
      </text>
      <text x="70" y="88" textAnchor="middle" className="fill-muted-foreground text-[11px]">
        {answers === 1 ? "answer" : "answers"}
      </text>
    </svg>
  );
}
