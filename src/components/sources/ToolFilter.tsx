import Link from "next/link";
import { cn } from "cn";
import type { ProviderId } from "@/modules/scanning";
import { TOOLS, toolHref } from "@/modules/sources/tools";

const OPTIONS: { provider: ProviderId | null; label: string }[] = [{ provider: null, label: "All tools" }, ...TOOLS];

/** All tools, ChatGPT, Claude or Perplexity: links (?tool=), so a filtered view can be shared and the server renders it. */
export function ToolFilter({ tool }: { tool: ProviderId | null }) {
  return (
    <nav aria-label="Filter by AI tool" data-testid="tool-filter">
      <ul className="inline-flex w-fit flex-wrap gap-0.5 rounded-[6px] border border-border bg-muted p-0.5">
        {OPTIONS.map((o) => {
          const on = o.provider === tool;
          return (
            <li key={o.label}>
              <Link
                href={toolHref(o.provider)}
                scroll={false}
                aria-current={on ? "page" : undefined}
                className={cn(
                  "inline-flex h-7 items-center rounded-[4px] px-2.5 text-xs font-medium transition-colors duration-150 ease-out outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                  on ? "bg-surface text-foreground shadow-xs ring-1 ring-border" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {o.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
