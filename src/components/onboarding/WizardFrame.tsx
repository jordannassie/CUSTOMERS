import Image from "next/image";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { cn } from "cn";
import { stepPath, type StepSlug } from "@/modules/onboarding/wizard/steps";
import { DoneStepIcon } from "./LinkPending";

export type FrameStep = { slug: StepSlug; label: string; state: "done" | "current" | "todo" };

type Props = {
  steps: FrameStep[];
  title: string;
  lead?: React.ReactNode;
  /** Inside the app frame (adding another business): no full-height rail. */
  embedded?: boolean;
  children: React.ReactNode;
};

// MVP_SPEC 3.1: one calm step at a time. Desktop keeps the whole path in a rail; a phone gets a compact bar.
export function WizardFrame({ steps, title, lead, embedded = false, children }: Props) {
  const index = steps.findIndex((s) => s.state === "current");
  const current = steps[index];
  // The app frame already has the page's <main>.
  const Main = embedded ? "div" : "main";

  return (
    <div className={cn("bg-background", embedded ? "" : "min-h-dvh lg:grid lg:grid-cols-[260px_minmax(0,1fr)]")}>
      {!embedded ? (
        <aside className="hidden border-r border-border bg-muted lg:block">
          <div className="sticky top-0 flex min-h-dvh flex-col px-6 py-8">
            <Image src="/images/logos/logo-black.png" alt="Customers.Direct" width={96} height={32} className="h-8 w-auto self-start" />
            <p className="mt-8 text-[13px] text-muted-foreground">Setting up</p>
            <ol className="mt-3 flex flex-col gap-1" aria-label="Setup steps">
              {steps.map((s, i) => (
                <li key={s.slug}>
                  <StepLink step={s} number={i + 1} />
                </li>
              ))}
            </ol>
            <p className="mt-auto text-xs leading-relaxed text-text-hint">Your progress saves after every step, so you can leave and come back.</p>
            <SignOut className="mt-4" />
          </div>
        </aside>
      ) : null}

      <Main className="min-w-0">
        {/* Outside the app frame a phone gets a full-width strip; inside it, the bar sits in the step's column, clear of the
            banners above (BUG-239). */}
        {!embedded ? (
          <div className="border-b border-border bg-surface py-3 lg:hidden">
            <StepProgress steps={steps} index={index} label={current?.label} className={cn(STEP_COLUMN, "mx-auto")} />
          </div>
        ) : null}

        {/* One column for every step and every part of it (bar, heading, form, Back and Continue), so the edges and the
            Continue button stay put from step to step. Inside the app frame it sits in the page column, under the
            banners' left edge, like every other app page. */}
        <div className={embedded ? "mx-auto w-full max-w-[1200px] px-4 py-6 sm:p-8" : cn(STEP_COLUMN, "mx-auto py-8 lg:py-12")}>
          <div className={embedded ? STEP_WIDTH : undefined}>
            {embedded ? <StepProgress steps={steps} index={index} label={current?.label} className="mb-6" /> : null}
            <header className="mb-6">
              <h1 className="text-2xl font-semibold tracking-[-0.02em] sm:text-[32px] sm:leading-tight">{title}</h1>
              {lead ? <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-muted-foreground">{lead}</p> : null}
            </header>
            {children}
            {/* Signed up with the wrong account, or on a shared computer: the steps must not trap anyone. */}
            {!embedded ? <SignOut className="mt-10 lg:hidden" /> : null}
          </div>
        </div>
      </Main>
    </div>
  );
}

// Every step's content width, and the column around it with the same side padding as the app banners.
const STEP_WIDTH = "max-w-[832px]";
const STEP_COLUMN = "w-full max-w-[896px] px-4 sm:px-8";

/** "Step 2 of 5" and one segment per step. Segments share the row (min-w-0), so any number of steps fits any width. */
function StepProgress({ steps, index, label, className }: { steps: FrameStep[]; index: number; label?: string; className?: string }) {
  return (
    <div className={className} data-testid="step-progress">
      <div className="flex min-w-0 items-baseline justify-between gap-3">
        <p className="shrink-0 text-[13px] font-medium tabular-nums">
          Step {index + 1} of {steps.length}
        </p>
        <p className="min-w-0 truncate text-[13px] text-muted-foreground" title={label}>
          {label}
        </p>
      </div>
      <div className="mt-2 flex min-w-0 gap-1" aria-hidden>
        {steps.map((s) => (
          <span key={s.slug} data-segment className={cn("h-1 min-w-0 flex-1 rounded-[2px]", s.state === "todo" ? "bg-border" : "bg-primary")} />
        ))}
      </div>
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
        {step.state === "done" ? <DoneStepIcon className="size-3.5" /> : number}
      </span>
      <span className={cn("text-sm", step.state === "current" ? "font-medium" : step.state === "todo" ? "text-text-hint" : "")}>
        {step.label}
      </span>
    </>
  );
  const row = "flex items-center gap-3 rounded-md px-2 py-2";
  if (step.state === "done") {
    return (
      // Setup pages render in full before they stream (instant = false): a prefetch of one only got a 404.
      <Link href={stepPath(step.slug)} prefetch={false} className={cn(row, "transition-colors duration-150 ease-out hover:bg-background")}>
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

function SignOut({ className }: { className?: string }) {
  return (
    <form action="/auth/signout" method="post" className={className}>
      <button type="submit" className="inline-flex min-h-11 items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <LogOut className="size-4" aria-hidden="true" />
        Sign out
      </button>
    </form>
  );
}
