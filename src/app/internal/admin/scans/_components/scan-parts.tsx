import { cn } from "cn";

const MODELS: Record<string, { label: string; dot: string }> = {
  openai: { label: "ChatGPT", dot: "bg-chatgpt" },
  anthropic: { label: "Claude", dot: "bg-claude" },
  perplexity: { label: "Perplexity", dot: "bg-perplexity" },
};

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


