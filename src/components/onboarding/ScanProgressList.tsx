import { Check } from "lucide-react";
import { cn } from "cn";
import type { ModelProgress } from "@/modules/onboarding";

const DOT: Record<string, string> = { openai: "bg-chatgpt", anthropic: "bg-claude", perplexity: "bg-perplexity" };

export type ScanState = "waiting" | "running" | "stopped" | "done";

/** One row per AI on the first scan screen, with the question it is asking once answers come in (DB-010). */
export function ScanProgressList({
  models,
  progress,
  state,
  asking,
}: {
  models: { id: string; label: string }[];
  progress: Map<string, ModelProgress> | null;
  state: ScanState;
  /** "Asking 12 questions…", shown until the first answer is saved. */
  asking: string;
}) {
  return (
    <ul className="rounded-md border border-border bg-surface" data-testid="first-scan-models">
      {models.map((model, i) => {
        const saved = progress?.get(model.id);
        return (
          <li key={model.id} className="flex flex-col gap-2.5 border-b border-border px-4 py-3.5 last:border-b-0">
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-sm font-medium">
                <span aria-hidden className={cn("size-2 rounded-full", DOT[model.id] ?? "bg-primary")} />
                {model.label}
              </span>
              <span className="text-[13px] text-muted-foreground">
                {state === "done" ? (
                  <Check aria-label="Done" className="size-4 text-good" />
                ) : state === "waiting" ? (
                  "Not started"
                ) : state === "stopped" ? (
                  "Not finished"
                ) : saved && saved.total > 0 ? (
                  <span className="tabular-nums">
                    {saved.done} of {saved.total}
                  </span>
                ) : (
                  asking
                )}
              </span>
            </div>
            <div className="h-1 overflow-hidden rounded-xs bg-border" aria-hidden>
              {state === "done" ? (
                <div className="h-full w-full bg-primary" />
              ) : state !== "running" ? null : saved && saved.done > 0 ? (
                <div
                  className="h-full w-full origin-left bg-primary transition-transform duration-200 ease-out"
                  style={{ transform: `scaleX(${saved.done / saved.total})` }}
                />
              ) : (
                <div
                  className="h-full w-2/5 animate-scan-sweep bg-primary motion-reduce:w-full motion-reduce:animate-none motion-reduce:opacity-40"
                  style={{ animationDelay: `${i * 220}ms` }}
                />
              )}
            </div>
            {state === "running" && saved?.asking && (
              <p className="truncate text-[13px] text-muted-foreground" data-testid="first-scan-asking">
                Asking {model.label}: {saved.asking}
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
