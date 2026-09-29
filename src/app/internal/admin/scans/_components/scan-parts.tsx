import { cn } from "cn";
import { Badge } from "@/components/ui/badge";
import type { ScanStatus } from "@/modules/admin";

export const STATUS: Record<ScanStatus, { label: string; badge: "good" | "low" | "mid" | "outline" }> = {
  failed: { label: "Failed", badge: "low" },
  running: { label: "Running", badge: "mid" },
  queued: { label: "Waiting", badge: "outline" },
  done: { label: "Done", badge: "good" },
};

const MODELS: Record<string, { label: string; dot: string }> = {
  openai: { label: "ChatGPT", dot: "bg-chatgpt" },
  anthropic: { label: "Claude", dot: "bg-claude" },
  perplexity: { label: "Perplexity", dot: "bg-perplexity" },
};

export function StatusBadge({ status }: { status: ScanStatus }) {
  return <Badge variant={STATUS[status].badge}>{STATUS[status].label}</Badge>;
}

export function ModelList({ models, className }: { models: string[]; className?: string }) {
  if (models.length === 0) return <span className="text-text-hint">None</span>;
  return (
    <ul className={cn("flex flex-wrap gap-x-3 gap-y-1", className)}>
      {models.map((m) => (
        <li key={m} className="flex items-center gap-1.5 whitespace-nowrap">
          <span aria-hidden className={cn("size-2 rounded-full", MODELS[m]?.dot ?? "bg-competitor-2")} />
          {MODELS[m]?.label ?? m}
        </li>
      ))}
    </ul>
  );
}

export function usd(value: number | null): string {
  if (value === null) return "";
  return `$${value.toFixed(value > 0 && value < 1 ? 4 : 2)}`;
}

export function when(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  });
}
