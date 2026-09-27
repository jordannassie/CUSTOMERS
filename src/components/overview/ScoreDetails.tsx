"use client";

import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import type { MethodPanel } from "@/modules/overview";

const DOT: Record<MethodPanel["models"][number]["id"], string> = {
  openai: "bg-chatgpt",
  anthropic: "bg-claude",
  perplexity: "bg-perplexity",
};

/** The details behind the score (B-57, D-64): numbers, per-AI scores and the method in plain words. */
export function ScoreDetails({ panel }: { panel: MethodPanel }) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="link" className="h-auto p-0">
          How is this calculated?
        </Button>
      </SheetTrigger>
      <SheetContent
        className="gap-0 overflow-y-auto data-[side=right]:w-full data-[side=right]:sm:max-w-md"
        data-testid="score-details"
      >
        <SheetHeader>
          <SheetTitle>{panel.title}</SheetTitle>
          <SheetDescription>{panel.intro}</SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-7 px-4 pb-8 text-sm">
          <Section heading="Your numbers">
            <dl className="grid grid-cols-[1fr_auto] gap-x-6 gap-y-3">
              {panel.numbers.map((n) => (
                <div key={n.label} className="contents">
                  <dt className="text-muted-foreground">
                    {n.label}
                    {n.hint && <span className="mt-0.5 block text-xs text-text-hint">{n.hint}</span>}
                  </dt>
                  <dd className="text-right tabular-nums">{n.value}</dd>
                </div>
              ))}
            </dl>
          </Section>

          <Section heading="Score by AI">
            <dl className="grid grid-cols-[1fr_auto] gap-x-6 gap-y-3">
              {panel.models.map((m) => (
                <div key={m.id} className="contents">
                  <dt className="flex items-center gap-2 text-muted-foreground">
                    <span className={cn("size-2 rounded-full", DOT[m.id])} aria-hidden="true" />
                    {m.label}
                  </dt>
                  <dd className="text-right tabular-nums">{m.value}</dd>
                </div>
              ))}
            </dl>
            <p className="text-muted-foreground">{panel.modelsNote}</p>
          </Section>

          {panel.sections.map((s) => (
            <Section key={s.heading} heading={s.heading}>
              {s.paragraphs.map((p) => (
                <p key={p} className="text-muted-foreground">
                  {p}
                </p>
              ))}
            </Section>
          ))}

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
      <h3 className="font-medium text-foreground">{heading}</h3>
      {children}
    </section>
  );
}
