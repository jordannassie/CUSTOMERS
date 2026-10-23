import { cn } from "cn";
import { resultText, type QuestionResult } from "@/modules/questions/service";
import type { ProviderId } from "@/modules/scanning";

const FILL: Record<ProviderId, string> = { openai: "bg-chatgpt", anthropic: "bg-claude", perplexity: "bg-perplexity" };

/** One pip per recent check, filled when AI recommended the business in it. */
export function ResultPips({ result }: { result: QuestionResult }) {
  const text = resultText(result);
  return (
    <div data-testid="question-result" data-model={result.model} className="flex min-w-0 flex-col gap-1.5" title={`${result.label}: ${text}`}>
      {/* On wide screens the list header names the model instead. */}
      <span className="text-xs text-muted-foreground lg:hidden" aria-hidden="true">
        {result.label}
      </span>
      {result.checks === 0 ? (
        <span className="text-[13px] text-text-hint">Not checked yet</span>
      ) : (
        <>
          <span className="flex gap-[3px]" aria-hidden="true">
            {Array.from({ length: result.checks }, (_, i) => (
              <span key={i} className={cn("h-2.5 w-2 rounded-xs", i < result.appeared ? FILL[result.model] : "bg-border")} />
            ))}
          </span>
          <span className="text-[13px] tabular-nums">
            <span className="sr-only">{result.label}: </span>
            <span aria-hidden="true">
              {result.appeared} of {result.checks}
            </span>
            <span className="sr-only">{text}</span>
          </span>
        </>
      )}
    </div>
  );
}
