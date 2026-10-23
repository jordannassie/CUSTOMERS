import { Badge } from "@/components/ui/badge";
import { MODEL_LABELS, type ModelKey } from "@/modules/usage";
import { cn } from "cn";
import { formatDate } from "../../_components/format";

export function DeletedBadge() {
  return <Badge variant="low">Deleted</Badge>;
}

/** When a deleted business's data is removed for good, from purge_after; `short` fits a list cell next to the badge. */
export function deletedNote(deletedAt: string, purgeAfter: string | null, short = false): string {
  if (!purgeAfter) return `Deleted ${formatDate(deletedAt)}`;
  if (short) return `Removed for good ${formatDate(purgeAfter)}`;
  return `Deleted ${formatDate(deletedAt)}, removed for good ${formatDate(purgeAfter)}`;
}

const MODEL_DOT: Record<string, string> = { openai: "bg-chatgpt", anthropic: "bg-claude", perplexity: "bg-perplexity" };

export function modelLabel(model: string): string {
  return MODEL_LABELS[model as ModelKey] ?? model;
}

export function ModelList({ models, className }: { models: string[]; className?: string }) {
  if (models.length === 0) return <span className="text-text-hint">None</span>;
  return (
    <ul className={cn("flex flex-wrap gap-x-3 gap-y-1", className)}>
      {models.map((m) => (
        <li key={m} className="inline-flex items-center gap-1.5 whitespace-nowrap">
          <span aria-hidden className={cn("size-2 rounded-full", MODEL_DOT[m] ?? "bg-border")} />
          {modelLabel(m)}
        </li>
      ))}
    </ul>
  );
}

const FREQUENCY: Record<string, string> = { daily: "Daily", weekly: "Weekly", monthly: "Monthly" };

export function frequencyLabel(frequency: string): string {
  return FREQUENCY[frequency] ?? frequency;
}
