import { ArrowRight } from "lucide-react";

// The "Ask about your results" box from the Check-in design. There is no endpoint that answers questions yet, so it
// stays disabled and says so (THEME_NOTES.md). The chips above it link to the pages that answer common questions.
export function Composer() {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border-strong bg-surface py-1.5 pr-1.5 pl-4 sm:ml-12" data-testid="ask-composer">
      <label htmlFor="ask-results" className="sr-only">
        Ask about your results
      </label>
      <input
        id="ask-results"
        type="text"
        disabled
        placeholder="Ask about your results (coming soon)"
        className="min-h-10 min-w-0 flex-1 border-0 bg-transparent text-[15px] outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
      />
      <span className="hidden rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground sm:inline">Coming soon</span>
      <button
        type="button"
        disabled
        aria-label="Send (coming soon)"
        className="flex size-11 shrink-0 items-center justify-center rounded-[12px] bg-brand text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        <ArrowRight className="size-[18px]" aria-hidden="true" />
      </button>
    </div>
  );
}
