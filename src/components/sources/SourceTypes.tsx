import { cn } from "cn";
import type { SourceType } from "@/modules/sources/classify";
import { answersText, type SourcesView } from "@/modules/sources/service";

/**
 * How many answers leaned on each kind of site (Check-in): a bar per kind on a sunken track, your own site in the
 * brand blue and the rest in grey, with the share on the right. One answer can use several kinds.
 */
export function SourceTypes({ types, answers }: { types: SourcesView["types"]; answers: number }) {
  const sum = types.reduce((n, t) => n + t.answers, 0);
  const overlap = sum > answers;
  const top = Math.max(1, ...types.map((t) => t.answers));
  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col" data-testid="source-types" aria-label="Kinds of websites, by answers that used them">
        {types.map((t, k) => (
          <li key={t.type} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1.5 border-t border-track py-2.5 text-sm first:border-t-0">
            {/* Label first, then its answers line, so screen readers and the e2e checks read them together. */}
            <span className="min-w-0">
              <span className="font-semibold">{t.label}</span>{" "}
              <span className="text-[13px] text-muted-foreground" title={t.kinds.join(", ")}>
                {answersText(t.answers, answers)}, {t.sites} {t.sites === 1 ? "site" : "sites"}
                {t.kinds.length > 1 ? `: ${t.kinds.join(", ")}` : ""}
              </span>
            </span>
            <span className="row-span-2 self-center font-semibold tabular-nums">{Math.round((t.answers / Math.max(answers, 1)) * 100)}%</span>
            <span className="block h-2.5 overflow-hidden rounded-full bg-sunken" aria-hidden="true">
              <span
                className={cn("block h-full origin-left animate-grow-x rounded-full", BAR[t.type])}
                style={{ width: `${Math.max(2, (t.answers / top) * 100)}%`, animationDelay: `${0.3 + k * 0.06}s` }}
              />
            </span>
          </li>
        ))}
      </ul>
      {overlap && <p className="text-xs text-muted-foreground">One answer can use several kinds, so these add up to more than {answers}.</p>}
    </div>
  );
}

// Your own site is you (brand); every other kind is a neutral grey, so no new hues.
const BAR: Record<SourceType, string> = {
  own: "bg-brand",
  directories: "bg-competitor-1",
  reviews: "bg-competitor-1",
  news: "bg-competitor-1",
  business: "bg-competitor-1",
};
