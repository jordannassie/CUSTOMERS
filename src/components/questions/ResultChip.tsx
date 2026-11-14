import { cn } from "cn";
import { resultText, type QuestionResult } from "@/modules/questions/service";

/**
 * One AI's result for a question as a small square (mockup-ui): light blue with a blue dot when it named you in its
 * recent checks (one colour for every AI, the column says which), plain with a grey dot when it did not, dashed when
 * it has not checked yet or the last check failed. On a phone the AI's name
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
          "grid h-[calc(22px*var(--px,1))] w-6 shrink-0 place-items-center rounded-sm border",
          named ? "border-transparent bg-primary-tint" : "border-border bg-surface",
          (!checked || result.failedLastScan) && "border-dashed",
        )}
      >
        {checked && <span className={cn("size-[calc(7px*var(--px,1))] rounded-full", named ? "bg-primary" : "bg-muted-foreground/25")} />}
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
