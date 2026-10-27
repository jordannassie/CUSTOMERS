"use client";

import { CheckCircle2, ListChecks, MapPin, MessageSquareText } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import type { MethodPanel } from "@/modules/overview";

const DOT: Record<MethodPanel["models"][number]["id"], string> = {
  openai: "bg-chatgpt",
  anthropic: "bg-claude",
  perplexity: "bg-perplexity",
};
const BAR: Record<MethodPanel["models"][number]["id"], string> = {
  openai: "bg-chatgpt",
  anthropic: "bg-claude",
  perplexity: "bg-perplexity",
};
const STEP_ICON = { ask: MessageSquareText, search: MapPin, count: CheckCircle2, questions: ListChecks } as const;
const LEVELS: { id: MethodPanel["accuracy"]["level"]; label: string }[] = [
  { id: "early", label: "Early" },
  { id: "good", label: "Good" },
  { id: "high", label: "High" },
];

/** The details behind the score (B-57, D-64): per-AI scores, how we check, the numbers and how sure the score is. */
export function ScoreDetails({ panel }: { panel: MethodPanel }) {
  const reached = LEVELS.findIndex((l) => l.id === panel.accuracy.level);
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="link" className="h-auto p-0">
          How is this calculated?
        </Button>
      </SheetTrigger>
      <SheetContent className="gap-0 overflow-y-auto data-[side=right]:w-full data-[side=right]:sm:max-w-lg" data-testid="score-details">
        <SheetHeader className="gap-1 border-b border-border pr-10 pb-5">
          <SheetTitle className="text-lg">{panel.title}</SheetTitle>
          <SheetDescription>{panel.intro}</SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-7 px-4 py-5 text-sm">
          <Section heading="Score by AI">
            <ul className="grid grid-cols-3 gap-2">
              {panel.models.map((m) => (
                <li key={m.id} className="flex flex-col gap-2 rounded-md border border-border px-3 py-2.5">
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className={cn("size-2 rounded-full", DOT[m.id])} aria-hidden="true" />
                    {m.label}
                  </span>
                  <span className={cn("tabular-nums", m.score !== null ? "text-xl font-semibold" : "text-[13px] text-muted-foreground")}>
                    {m.value}
                  </span>
                  <span className="h-1.5 rounded-xs bg-muted" aria-hidden="true">
                    <span className={cn("block h-full rounded-xs", BAR[m.id])} style={{ width: `${m.score ?? 0}%` }} />
                  </span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-text-hint">{panel.modelsNote}</p>
          </Section>

          <Section heading="How we check">
            <ol className="flex flex-col gap-3">
              {panel.steps.map((s) => {
                const Icon = STEP_ICON[s.icon];
                return (
                  <li key={s.icon} className="flex items-start gap-3">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary-tint text-primary" aria-hidden="true">
                      <Icon className="size-4" />
                    </span>
                    <span className="flex flex-col gap-0.5">
                      <span className="font-medium">{s.title}</span>
                      <span className="text-[13px] text-muted-foreground">{s.detail}</span>
                    </span>
                  </li>
                );
              })}
            </ol>
          </Section>

          <Section heading="Your numbers">
            <dl className="grid grid-cols-3 gap-2">
              {panel.numbers.map((n) => (
                <div key={n.label} className="flex flex-col gap-1 rounded-md border border-border px-3 py-2.5">
                  <dt className="text-xs text-muted-foreground">{n.label}</dt>
                  <dd className="font-semibold tabular-nums">{n.value}</dd>
                </div>
              ))}
            </dl>
            {panel.numbers.find((n) => n.hint) && <p className="text-xs text-text-hint">{panel.numbers.find((n) => n.hint)!.hint}</p>}
          </Section>

          <Section heading="Accuracy">
            <div className="flex flex-col gap-3 rounded-md border border-border p-3" data-testid="score-accuracy">
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-medium">{panel.accuracy.label}</span>
                <span className="text-[13px] tabular-nums text-muted-foreground">{panel.accuracy.margin}</span>
              </div>
              <ol className="grid grid-cols-3 gap-1.5" aria-label="Confidence levels">
                {LEVELS.map((l, i) => (
                  <li key={l.id} className="flex flex-col gap-1">
                    <span className={cn("h-1.5 rounded-xs", i <= reached ? "bg-primary" : "bg-muted")} aria-hidden="true" />
                    <span className={cn("text-xs", i === reached ? "font-medium text-primary" : "text-text-hint")}>{l.label}</span>
                  </li>
                ))}
              </ol>
              <p className="text-[13px] text-muted-foreground">{panel.accuracy.note}</p>
            </div>
          </Section>

          {panel.calibration && (
            <Section heading={panel.calibration.heading}>
              {panel.calibration.paragraphs.map((p) => (
                <p key={p} className="text-muted-foreground">
                  {p}
                </p>
              ))}
              <dl className="grid grid-cols-[1fr_auto] gap-x-6 gap-y-3">
                {panel.calibration.agreement.map((a) => (
                  <div key={a.label} className="contents">
                    <dt className="text-muted-foreground">{a.label}</dt>
                    <dd className="text-right tabular-nums">{a.value}</dd>
                  </div>
                ))}
              </dl>
            </Section>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Section({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold text-foreground">{heading}</h3>
      {children}
    </section>
  );
}
