import { cn } from "cn";
import { resultText, type QuestionResult } from "@/modules/questions/service";

/**
 * One AI's result for a question as a cell of a small dot matrix (Check-in theme): a brand blue circle with the number
 * of answers that named you, a small grey dot when it checked and did not, a dashed ring when it has not checked yet
 * (coral when the last scan could not check it). On a phone the AI's name and the count sit beside it; on a wide
 * screen the list header names the column and the count is in the tooltip.
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
      <span aria-hidden="true" className="grid size-6 shrink-0 place-items-center">
        {named ? (
          <span className="grid size-6 animate-pop place-items-center rounded-full bg-brand text-[11px] font-bold text-white tabular-nums">{result.appeared}</span>
        ) : checked ? (
          <span className={cn("size-2.5 rounded-full bg-border-strong", result.failedLastScan && "ring-2 ring-rival")} />
        ) : (
          <span className={cn("size-5 rounded-full border border-dashed border-border-strong", result.failedLastScan && "border-rival")} />
        )}
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
