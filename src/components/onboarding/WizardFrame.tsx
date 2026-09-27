import Link from "next/link";
import { Check } from "lucide-react";
import { cn } from "cn";
import { stepPath, type StepSlug } from "@/modules/onboarding/wizard/steps";

export type FrameStep = { slug: StepSlug; label: string; state: "done" | "current" | "todo" };

type Props = {
  steps: FrameStep[];
  title: string;
  lead?: React.ReactNode;
  /** Inside the app frame (adding another business): no full-height rail. */
  embedded?: boolean;
  wide?: boolean;
  children: React.ReactNode;
};

// MVP_SPEC 3.1: one calm step at a time. Desktop keeps the whole path in a rail; a phone gets a compact bar.
export function WizardFrame({ steps, title, lead, embedded = false, wide = false, children }: Props) {
  const index = steps.findIndex((s) => s.state === "current");
  const current = steps[index];

  return (
    <div className={cn("bg-background", embedded ? "" : "min-h-dvh lg:grid lg:grid-cols-[260px_minmax(0,1fr)]")}>
      {!embedded ? (
        <aside className="hidden border-r border-border bg-muted lg:block">
          <div className="sticky top-0 flex min-h-dvh flex-col px-6 py-8">
            <p className="text-[15px] font-semibold tracking-[-0.02em]">Customers.Direct</p>
            <p className="mt-8 text-[13px] text-muted-foreground">Setting up</p>
            <ol className="mt-3 flex flex-col gap-1" aria-label="Setup steps">
              {steps.map((s, i) => (
                <li key={s.slug}>
                  <StepLink step={s} number={i + 1} />
                </li>
              ))}
            </ol>
            <p className="mt-auto text-xs leading-relaxed text-text-hint">Your progress saves after every step, so you can leave and come back.</p>
          </div>
        </aside>
      ) : null}

      <main className="min-w-0">
        <div className={cn("border-b border-border bg-surface px-4 py-3 sm:px-8", embedded ? "" : "lg:hidden")}>
          <div className="mx-auto flex max-w-3xl items-baseline justify-between gap-3">
            <p className="text-[13px] font-medium">
              Step {index + 1} of {steps.length}
            </p>
            <p className="truncate text-[13px] text-muted-foreground">{current?.label}</p>
          </div>
          <div className="mx-auto mt-2 flex max-w-3xl gap-1" aria-hidden>
            {steps.map((s) => (
              <span key={s.slug} className={cn("h-1 flex-1 rounded-[2px]", s.state === "todo" ? "bg-border" : "bg-primary")} />
            ))}
          </div>
        </div>

        <div className={cn("mx-auto px-4 py-8 sm:px-8 lg:py-12", wide ? "max-w-5xl" : "max-w-2xl")}>
          <header className="mb-8">
            <h1 className="text-2xl font-semibold tracking-[-0.02em] sm:text-[32px] sm:leading-tight">{title}</h1>
            {lead ? <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-muted-foreground">{lead}</p> : null}
          </header>
          {children}
        </div>
      </main>
    </div>
  );
}

function StepLink({ step, number }: { step: FrameStep; number: number }) {
  const body = (
    <>
      <span
        className={cn(
          "flex size-6 shrink-0 items-center justify-center rounded-full border text-xs tabular-nums",
          step.state === "done" && "border-primary bg-primary text-primary-foreground",
          step.state === "current" && "border-primary bg-surface font-semibold text-primary",
          step.state === "todo" && "border-input text-text-hint",
        )}
      >
        {step.state === "done" ? <Check aria-hidden className="size-3.5" /> : number}
      </span>
      <span className={cn("text-sm", step.state === "current" ? "font-medium" : step.state === "todo" ? "text-text-hint" : "")}>
        {step.label}
      </span>
    </>
  );
  const row = "flex items-center gap-3 rounded-md px-2 py-2";
  if (step.state === "done") {
    return (
      <Link href={stepPath(step.slug)} className={cn(row, "transition-colors duration-150 ease-out hover:bg-background")}>
        {body}
        <span className="sr-only">(done, edit)</span>
      </Link>
    );
  }
  return (
    <div className={cn(row, step.state === "current" && "bg-surface")} aria-current={step.state === "current" ? "step" : undefined}>
      {body}
    </div>
  );
}
