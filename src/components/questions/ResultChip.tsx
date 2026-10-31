import { cn } from "cn";
import { resultText, type QuestionResult } from "@/modules/questions/service";
import type { ProviderId } from "@/modules/scanning";

const DOT: Record<ProviderId, string> = { openai: "bg-chatgpt", anthropic: "bg-claude", perplexity: "bg-perplexity" };
const TINT: Record<ProviderId, string> = { openai: "bg-chatgpt/15", anthropic: "bg-claude/15", perplexity: "bg-perplexity/15" };

/**
 * One AI's result for a question as a small square (mockup-ui): tinted with a coloured dot when it named you in its
 * recent checks, plain with a grey dot when it did not, dashed when it has not checked yet. On a phone the AI's name
 * and the count sit beside it; on a wide screen the list header names the column and the count is in the tooltip.
 */
export function ResultChip({ result }: { result: QuestionResult }) {
  const text = resultText(result);
  const named = result.appeared > 0;
  const checked = result.checks > 0;
  return (
    <div
      data-testid="question-result"
      data-model={result.model}
      data-failed={result.failedLastScan || undefined}
      className="flex min-w-0 items-center gap-1.5"
      title={`${result.label}: ${text}`}
    >
      <span
        aria-hidden="true"
        className={cn(
          "grid h-[22px] w-6 shrink-0 place-items-center rounded-sm border",
          named ? cn("border-transparent", TINT[result.model]) : "border-border bg-surface",
          !checked && "border-dashed",
          result.failedLastScan && "border-dashed border-mid",
        )}
      >
        {checked && <span className={cn("size-[7px] rounded-full", named ? DOT[result.model] : "bg-muted-foreground/25")} />}
      </span>
      <span className="text-xs text-muted-foreground tabular-nums lg:sr-only" aria-hidden="true">
        {result.label} {checked ? `${result.appeared} of ${result.checks}` : result.failedLastScan ? "couldn't check" : "not checked yet"}
      </span>
      <span className="sr-only">
        {result.label}: {text}
      </span>
    </div>
  );
}
