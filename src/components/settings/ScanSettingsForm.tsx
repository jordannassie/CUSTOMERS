"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "cn";
import { estimateMonthlyCredits } from "@/modules/credits/estimate";
import { FREQUENCIES, type Frequency, type ModelId } from "@/modules/settings/schema";
import { FREQUENCY_LABELS, MODELS, untickWarning } from "@/modules/settings/service";
import { Button } from "@/components/ui/button";
import type { SaveAction } from "./BusinessProfileForm";
import { FormError, Panel } from "./SettingsSection";

const DOT: Record<ModelId, string> = { openai: "bg-chatgpt", anthropic: "bg-claude", perplexity: "bg-perplexity" };
const count = (n: number) => n.toLocaleString("en-US");

export type ScanSettingsProps = {
  businessId: string;
  models: ModelId[];
  frequency: Frequency;
  activeQuestions: number;
  plan: { name: string; monthlyCredits: number | null } | null;
  questionsHref: string;
  save: SaveAction;
};

export function ScanSettingsForm({ businessId, models, frequency, activeQuestions, plan, questionsHref, save }: ScanSettingsProps) {
  const [chosen, setChosen] = useState<ModelId[]>(models);
  const [often, setOften] = useState<Frequency>(frequency);
  const [saved, setSaved] = useState({ models, frequency });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const before = estimateMonthlyCredits(activeQuestions, saved.models.length, saved.frequency);
  const after = estimateMonthlyCredits(activeQuestions, chosen.length, often);
  const dirty = often !== saved.frequency || chosen.length !== saved.models.length || chosen.some((m) => !saved.models.includes(m));

  function toggle(id: ModelId) {
    setChosen((list) => (list.includes(id) ? list.filter((m) => m !== id) : MODELS.map((m) => m.id).filter((m) => m === id || list.includes(m))));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (chosen.length === 0) return setError("Pick at least one AI model.");
    startTransition(async () => {
      const result = await save({ businessId, models: chosen, frequency: often });
      if (!result.ok) return setError(result.error);
      setSaved({ models: chosen, frequency: often });
      toast.success("AI check settings saved");
    });
  }

  return (
    <Panel className="p-0">
      <form onSubmit={submit} aria-label="AI checks" className="grid md:grid-cols-[minmax(0,1fr)_240px]">
        <div className="flex flex-col gap-6 p-5">
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-sm font-medium">AI models</legend>
            {MODELS.map((model) => {
              const on = chosen.includes(model.id);
              return (
                <label
                  key={model.id}
                  className={cn(
                    "flex cursor-pointer gap-3 rounded-md border px-3.5 py-3 transition-colors",
                    on ? "border-primary/40 bg-primary-tint/50" : "border-border hover:bg-muted",
                  )}
                >
                  <input
                    type="checkbox"
                    name="models"
                    value={model.id}
                    checked={on}
                    onChange={() => toggle(model.id)}
                    className="mt-0.5 size-4 shrink-0 accent-primary"
                  />
                  <span className="min-w-0">
                    <span className="flex items-center gap-2 text-sm font-medium">
                      <span aria-hidden="true" className={cn("size-2 rounded-full", DOT[model.id])} />
                      {model.label}
                    </span>
                    <span className="mt-0.5 block text-[13px] text-muted-foreground">
                      {on ? model.explanation : untickWarning(model.label)}
                    </span>
                  </span>
                </label>
              );
            })}
          </fieldset>

          <fieldset>
            <legend className="mb-2 text-sm font-medium">How often to check</legend>
            <div className="inline-flex rounded-md border border-input p-0.5">
              {FREQUENCIES.map((f) => (
                <label
                  key={f}
                  className={cn(
                    "cursor-pointer rounded-[3px] px-4 py-1.5 text-sm transition-colors has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50",
                    often === f ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted",
                  )}
                >
                  <input type="radio" name="frequency" value={f} checked={often === f} onChange={() => setOften(f)} className="sr-only" />
                  {FREQUENCY_LABELS[f]}
                </label>
              ))}
            </div>
          </fieldset>

          <FormError message={error} />
          <div>
            <Button type="submit" disabled={pending || !dirty}>
              {pending && <Loader2 className="animate-spin" aria-hidden="true" />}
              Save AI checks
            </Button>
          </div>
        </div>

        <Estimate before={before} after={after} dirty={dirty} activeQuestions={activeQuestions} models={chosen.length} plan={plan} questionsHref={questionsHref} />
      </form>
    </Panel>
  );
}

function Estimate({
  before,
  after,
  dirty,
  activeQuestions,
  models,
  plan,
  questionsHref,
}: {
  before: number;
  after: number;
  dirty: boolean;
  activeQuestions: number;
  models: number;
  plan: ScanSettingsProps["plan"];
  questionsHref: string;
}) {
  const planCredits = plan?.monthlyCredits ?? null;
  const share = planCredits ? Math.min(100, Math.round((after / planCredits) * 100)) : null;
  const over = planCredits !== null && after > planCredits;
  const change = after - before;

  return (
    <aside
      aria-live="polite"
      data-testid="credit-estimate"
      className="flex flex-col gap-3 border-t border-border bg-muted p-5 md:border-t-0 md:border-l"
    >
      <p className="text-[13px] text-muted-foreground">Estimated use</p>
      <p className="leading-none">
        <span className="text-[32px] font-semibold tracking-[-0.02em] tabular-nums">About {count(after)}</span>
        <span className="mt-1.5 block text-sm text-muted-foreground">credits a month</span>
      </p>
      {dirty && change !== 0 && (
        <p data-testid="estimate-change" className={cn("text-[13px] font-medium tabular-nums", change > 0 ? "text-mid-text" : "text-good-text")}>
          {change > 0 ? `${count(change)} more` : `${count(-change)} fewer`} than now ({count(before)})
        </p>
      )}
      {share !== null && (
        <div className="flex flex-col gap-1.5">
          <div className="h-1.5 overflow-hidden rounded-[2px] bg-border" aria-hidden="true">
            <div className={cn("h-full", over ? "bg-mid" : "bg-primary")} style={{ width: `${share}%` }} />
          </div>
          <p className="text-xs text-muted-foreground tabular-nums">
            {over
              ? `More than the ${count(planCredits!)} credits your ${plan!.name} plan adds each month.`
              : `${share}% of the ${count(planCredits!)} credits your ${plan!.name} plan adds each month.`}
          </p>
        </div>
      )}
      <p className="mt-auto text-xs leading-relaxed text-text-hint">
        {activeQuestions === 0 ? (
          <>
            No active questions yet, so checks use no credits.{" "}
            <Link href={questionsHref} className="text-primary underline-offset-2 hover:underline">
              Add questions
            </Link>
          </>
        ) : (
          `${count(activeQuestions)} questions × ${models} ${models === 1 ? "model" : "models"}. Each answer uses 1 credit.`
        )}
      </p>
    </aside>
  );
}
