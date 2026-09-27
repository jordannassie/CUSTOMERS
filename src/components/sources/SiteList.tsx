import { ExternalLink } from "lucide-react";
import { cn } from "cn";
import { Badge } from "@/components/ui/badge";
import { MODEL_LABELS } from "@/modules/overview";
import { answersText, type SourcesView } from "@/modules/sources";

const DOT = { openai: "bg-chatgpt", anthropic: "bg-claude", perplexity: "bg-perplexity" } as const;

/** Every cited site, most cited first. A list rather than a table so rows stack cleanly on a phone. */
export function SiteList({ sites, answers }: { sites: SourcesView["sites"]; answers: number }) {
  return (
    <div className="flex flex-col">
      <div
        className="hidden grid-cols-[minmax(0,1fr)_160px_200px_150px] gap-4 border-b border-border pb-2 text-xs font-medium text-muted-foreground md:grid"
        aria-hidden="true"
      >
        <span>Website</span>
        <span>Type</span>
        <span>How often AI cited it</span>
        <span>Cited by</span>
      </div>
      <ul className="flex flex-col divide-y divide-border" data-testid="site-list">
        {sites.map((s) => (
          <li
            key={s.host}
            data-testid="site-row"
            className={cn(
              "grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-2 py-3 md:grid-cols-[minmax(0,1fr)_160px_200px_150px] md:items-center",
              s.type === "own" && "-mx-3 rounded-md bg-primary-tint px-3",
            )}
          >
            <a
              href={`https://${s.host}`}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="flex min-w-0 items-center gap-1.5 text-sm font-medium hover:text-primary hover:underline"
            >
              <span className="truncate">{s.host}</span>
              <ExternalLink className="size-3.5 shrink-0 text-text-hint" aria-hidden="true" />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
            <span className="justify-self-end md:justify-self-start">
              <Badge variant={s.type === "own" ? "tint" : "secondary"}>{s.typeLabel}</Badge>
            </span>
            <div className="col-span-2 flex items-center gap-3 md:col-span-1">
              <div className="h-1.5 w-20 shrink-0 overflow-hidden rounded-xs bg-muted md:w-16" aria-hidden="true">
                <div
                  className={cn("h-full rounded-xs", s.type === "own" ? "bg-primary" : "bg-competitor-1")}
                  style={{ width: `${Math.round((s.answers / answers) * 100)}%` }}
                />
              </div>
              <span className="text-sm tabular-nums" data-testid="site-count">
                {answersText(s.answers, answers)}
              </span>
            </div>
            <ul className="col-span-2 flex flex-wrap gap-x-3 gap-y-1 md:col-span-1" aria-label="Cited by">
              {s.models.map((m) => (
                <li key={m} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className={cn("size-2 rounded-full", DOT[m])} aria-hidden="true" />
                  {MODEL_LABELS[m]}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}
