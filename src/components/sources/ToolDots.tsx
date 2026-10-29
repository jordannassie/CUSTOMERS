import { cn } from "cn";
import type { ProviderId } from "@/modules/scanning";
import { TOOLS } from "@/modules/sources/tools";

const DOT: Record<ProviderId, string> = { openai: "bg-chatgpt", anthropic: "bg-claude", perplexity: "bg-perplexity" };

/** One dot per AI tool, filled when that tool used the site. The words are there for screen readers, not only colour. */
export function ToolDots({ models }: { models: ProviderId[] }) {
  const used = TOOLS.filter((t) => models.includes(t.provider)).map((t) => t.label);
  return (
    <span className="inline-flex items-center gap-1.5" data-testid="tool-dots">
      {TOOLS.map((t) => {
        const on = models.includes(t.provider);
        return (
          <span
            key={t.provider}
            title={`${t.label}: ${on ? "used it" : "did not use it"}`}
            aria-hidden="true"
            className={cn("size-2.5 rounded-full", on ? DOT[t.provider] : "border border-input bg-surface")}
          />
        );
      })}
      <span className="sr-only">{used.length > 0 ? `Used by ${used.join(", ")}` : "Not used by any AI tool"}</span>
    </span>
  );
}

/** The key under the table: which colour is which tool. */
export function ToolDotsKey() {
  return (
    <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1" aria-hidden="true">
      {TOOLS.map((t) => (
        <span key={t.provider} className="inline-flex items-center gap-1.5">
          <span className={cn("size-2.5 rounded-full", DOT[t.provider])} />
          {t.label}
        </span>
      ))}
    </span>
  );
}
