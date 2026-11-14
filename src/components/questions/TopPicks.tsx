import { cn } from "cn";
import type { QuestionRow } from "@/modules/questions/service";

// Grey letter marks: the names are in the tooltip, and five tints per row read as noise (colour cleanup, 2026-11-10).
const TINT = "bg-muted text-foreground/80";

/** The businesses AI named most on this question, as overlapping letter marks; the names are in the tooltip. */
export function TopPicks({ question }: { question: QuestionRow }) {
  const named = question.summary?.named ?? [];
  if (named.length === 0) return <span className="text-xs text-text-hint">None yet</span>;
  const title = named.map((n) => `${n.name}, named in ${n.answers} ${n.answers === 1 ? "answer" : "answers"}`).join("\n");
  return (
    <span className="inline-flex items-center" title={title} aria-hidden="true" data-testid="top-picks">
      {named.map((n, i) => (
        <span
          key={n.name}
          className={cn(
            "grid size-5 shrink-0 place-items-center rounded-full text-[length:calc(10px*var(--px,1))] font-semibold uppercase ring-2 ring-surface",
            i > 0 && "-ml-1",
            TINT,
          )}
        >
          {n.name.trim().charAt(0)}
        </span>
      ))}
    </span>
  );
}
