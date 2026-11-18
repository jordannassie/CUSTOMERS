import type { SourceType } from "@/modules/sources/classify";
import { answersText, type SourcesView } from "@/modules/sources/service";

const COLOR: Record<SourceType, string> = {
  own: "var(--chart-1)",
  directories: "var(--cd-series-4)",
  reviews: "var(--cd-series-3)",
  news: "var(--cd-series-5)",
  business: "var(--cd-series-2)",
};

/**
 * How many answers leaned on each kind of site: one bar per kind, each out of all the answers. One answer can use
 * several kinds, so the shares add up to more than 100%; a donut drew them as slices of one whole (67% and 67% as two
 * halves, BUG-313).
 */
export function SourceTypes({ types, answers }: { types: SourcesView["types"]; answers: number }) {
  const sum = types.reduce((n, t) => n + t.answers, 0);
  const overlap = sum > answers;
  return (
    <div className="flex flex-col gap-4 px-4 py-5 sm:px-4">
      <ul className="flex w-full min-w-0 flex-col gap-4" data-testid="source-types">
        {types.map((t) => {
          const share = Math.round((t.answers / Math.max(answers, 1)) * 100);
          return (
            // The label comes first and the answers line right after it in reading order; the percent sits top right.
            <li key={t.type} className="grid grid-cols-[calc(8px*var(--px,1))_minmax(0,1fr)_auto] items-center gap-x-2.5 gap-y-1 text-[length:calc(13px*var(--px,1))]">
              <span className="row-start-1 size-2 rounded-[2px]" style={{ background: COLOR[t.type] }} aria-hidden="true" />
              <span className="col-start-2 row-start-1 truncate font-medium">{t.label}</span>
              <span className="col-start-3 row-start-1 font-semibold tabular-nums">{share}%</span>
              <span className="col-span-2 col-start-2 row-start-2 h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                <span className="block h-full rounded-full" style={{ width: `${Math.max(share, share > 0 ? 2 : 0)}%`, background: COLOR[t.type] }} />
              </span>
              <span className="col-span-2 col-start-2 row-start-3 truncate text-xs text-text-hint" title={t.kinds.join(", ")}>
                {answersText(t.answers, answers)}
                <span>
                  {" "}
                  · {t.sites} {t.sites === 1 ? "site" : "sites"}
                  {t.kinds.length > 1 ? `: ${t.kinds.join(", ")}` : ""}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
      {overlap && (
        <p className="text-xs text-text-hint">One answer can use several kinds, so these add up to more than 100%.</p>
      )}
    </div>
  );
}
