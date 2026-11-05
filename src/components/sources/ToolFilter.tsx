import Link from "next/link";
import { cn } from "cn";
import type { ProviderId } from "@/modules/scanning";
import { TOOLS, toolHref } from "@/modules/sources/tools";

const OPTIONS: { provider: ProviderId | null; label: string }[] = [{ provider: null, label: "All tools" }, ...TOOLS];

/** All tools, ChatGPT, Claude or Perplexity: links (?tool=), so a filtered view can be shared and the server renders it. */
export function ToolFilter({ tool }: { tool: ProviderId | null }) {
  return (
    <nav aria-label="Filter by AI tool" data-testid="tool-filter">
      <ul className="inline-flex w-fit flex-wrap gap-1 rounded-full border border-border bg-surface p-1">
        {OPTIONS.map((o) => {
          const on = o.provider === tool;
          return (
            <li key={o.label}>
              <Link
                href={toolHref(o.provider)}
                scroll={false}
                aria-current={on ? "page" : undefined}
                className={cn(
                  "inline-flex h-8 items-center rounded-full px-3.5 text-[13px] font-medium transition-colors duration-150 ease-out pointer-coarse:h-11",
                  on ? "bg-brand text-white" : "text-ink-2 hover:text-foreground",
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
