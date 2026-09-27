"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn } from "cn";
import type { ActionResult } from "@/modules/auth";
import { estimateMonthlyCredits } from "@/modules/credits/estimate";
import { FREQUENCIES, type Frequency, type ModelId } from "@/modules/settings/schema";
import { FREQUENCY_LABELS, MODELS, untickWarning } from "@/modules/settings/service";
import { StepActions, StepError } from "./StepBits";

const DOT: Record<ModelId, string> = { openai: "bg-chatgpt", anthropic: "bg-claude", perplexity: "bg-perplexity" };
const count = (n: number) => n.toLocaleString("en-US");
const CADENCE: Record<Frequency, string> = { daily: "every day", weekly: "once a week", monthly: "once a month" };

type Props = {
  businessId: string;
  models: ModelId[];
  frequency: Frequency;
  activeQuestions: number;
  plan: { name: string; monthlyCredits: number | null } | null;
  save: (input: { businessId: string; models: ModelId[]; frequency: Frequency }) => Promise<ActionResult<null>>;
};

// MVP_SPEC 3.1 step 7 and 4.3: the estimate follows every tick and switch at once, before anything is saved.
export function ModelsStep({ businessId, models, frequency, activeQuestions, plan, save }: Props) {
  const router = useRouter();
  const [chosen, setChosen] = useState<ModelId[]>(models);
  const [often, setOften] = useState<Frequency>(frequency);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const credits = estimateMonthlyCredits(activeQuestions, chosen.length, often);
  const planCredits = plan?.monthlyCredits ?? null;
  const share = planCredits ? Math.min(100, Math.round((credits / planCredits) * 100)) : null;
  const over = planCredits !== null && credits > planCredits;

  function toggle(id: ModelId) {
    setChosen((list) => MODELS.map((m) => m.id).filter((m) => (m === id ? !list.includes(id) : list.includes(m))));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (chosen.length === 0) return setError("Pick at least one AI model.");
    startTransition(async () => {
      const result = await save({ businessId, models: chosen, frequency: often });
      if (!result.ok) return setError(result.error);
      router.push("/dashboard");
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-8">
      <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_260px]">
        <div className="flex flex-col gap-8">
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-sm font-medium">Which AI should we check?</legend>
            {MODELS.map((model) => {
              const on = chosen.includes(model.id);
              return (
                <label
                  key={model.id}
                  className={cn(
                    "flex cursor-pointer gap-3 rounded-md border px-4 py-3.5 transition-colors duration-150 ease-out",
                    on ? "border-primary/40 bg-primary-tint" : "border-border bg-surface hover:bg-muted",
                  )}
                >
                  <input type="checkbox" checked={on} onChange={() => toggle(model.id)} className="mt-0.5 size-4 shrink-0 accent-primary" />
                  <span className="min-w-0">
                    <span className="flex items-center gap-2 text-sm font-medium">
                      <span aria-hidden className={cn("size-2 rounded-full", DOT[model.id])} />
                      {model.label}
                    </span>
                    <span className={cn("mt-0.5 block text-[13px]", on ? "text-muted-foreground" : "text-mid-text")}>
                      {on ? model.explanation : untickWarning(model.label)}
                    </span>
                  </span>
                </label>
              );
            })}
          </fieldset>

          <fieldset>
            <legend className="mb-2 text-sm font-medium">How often?</legend>
            <div className="grid grid-cols-3 rounded-md border border-input bg-surface p-0.5 sm:inline-grid">
              {FREQUENCIES.map((f) => (
                <label
                  key={f}
                  className={cn(
                    "cursor-pointer rounded-[3px] px-5 py-2 text-center text-sm transition-colors duration-150 ease-out has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50",
                    often === f ? "bg-primary text-primary-foreground" : "hover:bg-muted",
                  )}
                >
                  <input type="radio" name="frequency" value={f} checked={often === f} onChange={() => setOften(f)} className="sr-only" />
                  {FREQUENCY_LABELS[f]}
                </label>
              ))}
            </div>
            <p className="mt-2 text-[13px] text-muted-foreground">Weekly suits most businesses. You can change this any time in Settings.</p>
          </fieldset>
        </div>

        <aside aria-live="polite" data-testid="credit-estimate" className="self-start rounded-md border border-border bg-muted p-5 md:sticky md:top-8">
          <p className="text-[13px] text-muted-foreground">Estimated use</p>
          <p className="mt-2 leading-none">
            <span className="text-[40px] font-semibold tracking-[-0.03em] tabular-nums">{count(credits)}</span>
            <span className="mt-2 block text-sm text-muted-foreground">credits a month</span>
          </p>
          {share !== null ? (
            <div className="mt-4 flex flex-col gap-1.5">
              <div className="h-1.5 overflow-hidden rounded-[2px] bg-border" aria-hidden>
                <div className={cn("h-full transition-[width] duration-200 ease-out", over ? "bg-mid" : "bg-primary")} style={{ width: `${share}%` }} />
              </div>
              <p className={cn("text-xs tabular-nums", over ? "text-mid-text" : "text-muted-foreground")}>
                {over
                  ? `More than the ${count(planCredits!)} credits your ${plan!.name} plan adds each month.`
                  : `${share}% of the ${count(planCredits!)} credits your ${plan!.name} plan adds each month.`}
              </p>
            </div>
          ) : null}
          <p className="mt-4 border-t border-border pt-3 text-xs leading-relaxed text-text-hint">
            {count(activeQuestions)} {activeQuestions === 1 ? "question" : "questions"} × {chosen.length} {chosen.length === 1 ? "model" : "models"}, checked {CADENCE[often]}. Each answer uses 1 credit.
          </p>
        </aside>
      </div>

      <StepError message={error} />
      <StepActions backHref="/onboarding/questions" pending={pending} label="Finish setup" disabled={chosen.length === 0} />
    </form>
  );
}
