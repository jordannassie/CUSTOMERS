import { Badge } from "@/components/ui/badge";
import { MODEL_LABELS, type ModelKey } from "@/modules/usage";
import { cn } from "cn";
import { formatDate } from "../../_components/format";

export function DeletedBadge() {
  return <Badge variant="secondary">Deleted</Badge>;
}

export function PausedBadge() {
  return <Badge variant="secondary">Paused</Badge>;
}

/**
 * When a deleted business's data is removed for good, from purge_after; `short` fits a list cell next to the badge.
 * A date still ahead says "will be" (admin audit 2026-11-12: a future date read like something already done).
 */
export function deletedNote(deletedAt: string, purgeAfter: string | null, short = false, now = new Date()): string {
  if (!purgeAfter) return `Deleted ${formatDate(deletedAt)}`;
  const removal = new Date(purgeAfter) > now ? `will be removed for good on ${formatDate(purgeAfter)}` : `removed for good on ${formatDate(purgeAfter)}`;
  if (short) return removal.charAt(0).toUpperCase() + removal.slice(1);
  return `Deleted ${formatDate(deletedAt)}, ${removal}`;
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
