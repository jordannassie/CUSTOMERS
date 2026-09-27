import { cn } from "cn";
import { answersText, type SourcesView } from "@/modules/sources";

/** How many answers leaned on each kind of site, so owners see where to be listed first. */
export function SourceTypes({ types, answers }: { types: SourcesView["types"]; answers: number }) {
  return (
    <ul className="flex flex-col gap-4" data-testid="source-types">
      {types.map((t) => (
        <li key={t.type} className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="font-medium">{t.label}</span>
            <span className="text-muted-foreground tabular-nums">{answersText(t.answers, answers)}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-xs bg-muted" aria-hidden="true">
            <div
              className={cn("h-full rounded-xs", t.type === "own" ? "bg-primary" : "bg-competitor-1")}
              style={{ width: `${Math.round((t.answers / answers) * 100)}%` }}
            />
          </div>
          <span className="text-xs text-text-hint">
            {t.sites} {t.sites === 1 ? "site" : "sites"}
          </span>
        </li>
      ))}
    </ul>
  );
}
