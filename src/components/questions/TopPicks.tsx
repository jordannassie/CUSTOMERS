import { cn } from "cn";
import type { QuestionRow } from "@/modules/questions/service";

// Soft tints for the letter marks; a name always gets the same one, so a business looks the same on every row.
const TINTS = [
  "bg-primary-tint text-primary-hover",
  "bg-mid-bg text-mid-text",
  "bg-good-bg text-good-text",
  "bg-low-bg text-low-text",
  "bg-muted text-muted-foreground",
];

function tintOf(name: string): string {
  let h = 0;
  for (const ch of name.toLowerCase()) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return TINTS[h % TINTS.length];
}

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
            "grid size-5 shrink-0 place-items-center rounded-full text-[10px] font-semibold uppercase ring-2 ring-surface",
            i > 0 && "-ml-1",
            tintOf(n.name),
          )}
        >
          {n.name.trim().charAt(0)}
        </span>
      ))}
    </span>
  );
}
