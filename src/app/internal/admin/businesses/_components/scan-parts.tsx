import { Badge } from "@/components/ui/badge";
import type { ScanState } from "@/modules/admin";
import { MODEL_LABELS, type ModelKey } from "@/modules/usage";
import { cn } from "cn";

const STATE: Record<ScanState, { label: string; variant: "good" | "mid" | "low" | "tint" }> = {
  queued: { label: "Queued", variant: "tint" },
  running: { label: "Scanning", variant: "mid" },
  done: { label: "Done", variant: "good" },
  failed: { label: "Failed", variant: "low" },
};

export function DeletedBadge() {
  return <Badge variant="low">Deleted</Badge>;
}

/** When a deleted business's data is removed for good, from purge_after; `short` fits a list cell next to the badge. */
export function deletedNote(deletedAt: string, purgeAfter: string | null, short = false): string {
  if (!purgeAfter) return `Deleted ${formatDate(deletedAt)}`;
  if (short) return `Removed for good ${formatDate(purgeAfter)}`;
  return `Deleted ${formatDate(deletedAt)}, removed for good ${formatDate(purgeAfter)}`;
}

export function ScanBadge({ state }: { state: ScanState }) {
  return <Badge variant={STATE[state].variant}>{STATE[state].label}</Badge>;
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

// UTC, so every admin reads the same time whatever the server's zone.
export function formatDate(iso: string, withTime = false): string {
  const text = new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    ...(withTime && { hour: "numeric", minute: "2-digit" }),
    timeZone: "UTC",
  });
  return withTime ? `${text} UTC` : text;
}
