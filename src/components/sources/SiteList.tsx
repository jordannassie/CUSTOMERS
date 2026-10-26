import { ExternalLink } from "lucide-react";
import { cn } from "cn";
import { Badge } from "@/components/ui/badge";
import { answersText, type SourcesView } from "@/modules/sources";

/** Every cited site, most cited first. A list rather than a table so rows stack cleanly when the list is narrow. */
export function SiteList({ sites, answers }: { sites: SourcesView["sites"]; answers: number }) {
  return (
    // Sized by its own width, not the screen: next to the side panel the list is narrow even on a laptop.
    <div className="@container flex flex-col">
      <div
        className="hidden grid-cols-[minmax(0,1fr)_160px_220px] gap-4 border-b border-border pb-2 text-xs font-medium text-muted-foreground @min-[560px]:grid"
        aria-hidden="true"
      >
        <span>Website</span>
        <span>Type</span>
        <span>How often AI used it</span>
      </div>
      <ul className="flex flex-col divide-y divide-border" data-testid="site-list">
        {sites.map((s) => (
          <li
            key={s.host}
            data-testid="site-row"
            className={cn(
              "grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-2 py-3 @min-[560px]:grid-cols-[minmax(0,1fr)_160px_220px] @min-[560px]:items-center",
              s.type === "own" && "-mx-3 rounded-md bg-primary-tint px-3",
            )}
          >
            <a
              href={`https://${s.host}`}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="flex min-w-0 items-center gap-1.5 text-sm font-medium hover:text-primary hover:underline"
            >
              <span className="truncate" title={s.host}>{s.host}</span>
              <ExternalLink className="size-3.5 shrink-0 text-text-hint" aria-hidden="true" />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
            <span className="justify-self-end @min-[560px]:justify-self-start">
              <Badge variant={s.type === "own" ? "tint" : "secondary"}>{s.typeLabel}</Badge>
            </span>
            <div className="col-span-2 flex items-center gap-3 @min-[560px]:col-span-1">
              <div className="h-1.5 w-20 shrink-0 overflow-hidden rounded-xs bg-muted @min-[560px]:w-14" aria-hidden="true">
                <div
                  className={cn("h-full rounded-xs", s.type === "own" ? "bg-primary" : "bg-competitor-1")}
                  style={{ width: `${Math.round((s.answers / answers) * 100)}%` }}
                />
              </div>
              <span className="text-sm whitespace-nowrap tabular-nums" data-testid="site-count">
                {answersText(s.answers, answers)}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
