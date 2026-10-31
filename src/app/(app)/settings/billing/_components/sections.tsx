import Link from "next/link";
import { AlertCircle, CalendarClock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatUsd } from "@/modules/billing/format";
import type { BillingView } from "@/modules/billing";
import { CancelDialog } from "./cancel-dialog";
import { ChangeDialog, type ChangeAction } from "./change-dialog";
import { LocalDate } from "@/components/ui/local-date";

const STATUS: Record<string, { label: string; variant: "tint" | "good" | "low" | "secondary" }> = {
  trialing: { label: "Free trial", variant: "tint" },
  active: { label: "Active", variant: "good" },
  past_due: { label: "Payment failed", variant: "low" },
  canceled: { label: "Ended", variant: "secondary" },
};

export function PlanStatus({ view, keep }: { view: BillingView; keep: ChangeAction }) {
  const status = STATUS[view.status] ?? { label: "Active", variant: "good" as const };
  const billed = view.onPlan.filter((b) => !b.notCharged);
  // What the businesses are charged now, which can be an older amount than the plan's price (D-93).
  const monthly = billed.reduce((sum, b) => sum + b.priceCents, 0);

  return (
    <div className="flex flex-col gap-3">
      <p className="flex flex-wrap items-center gap-2 text-sm" data-testid="plan-status">
        <Badge variant={status.variant}>{status.label}</Badge>
        {view.status === "trialing" && view.trialEndsAt && !view.cancelAt && (
          <span className="text-muted-foreground">
            Your free trial ends on <LocalDate iso={view.trialEndsAt} />. Cancel before then and you won&apos;t be charged.
          </span>
        )}
        {view.status === "active" && monthly > 0 && (
          <span className="text-muted-foreground">
            {billed.length === 1 ? "1 business" : `${billed.length} businesses`} for {formatUsd(monthly)} a month.
          </span>
        )}
      </p>

      {view.status === "past_due" && (
        <Notice tone="danger" testId="past-due-notice">
          Your last payment didn&apos;t go through, so scans are paused. Use Manage card and invoices to update your
          card, and we&apos;ll try the payment again.
        </Notice>
      )}
      {view.cancelAt && (
        <Notice tone="warning" testId="cancel-notice">
          {/* Matches the Overview banner (BUG-B): a cancelled trial is never charged and holds trial credits. */}
          <span>
            {view.status === "trialing" ? "Your free trial ends on " : "Your plan ends on "}
            <LocalDate iso={view.cancelAt} />
            {view.status === "trialing"
              ? ". Your trial credits work until then, and you won't be charged."
              : view.status === "past_due"
                ? ". You won't be charged for another month, but the unpaid invoice may still be collected."
                : ". Your plan credits work until then, and you won't be charged again."}
          </span>
          <ChangeDialog
            label="Keep my plan"
            title="Keep your plan?"
            confirmLabel="Keep my plan"
            action={keep}
            variant="default"
            className="mt-3 w-fit"
          />
        </Notice>
      )}
    </div>
  );
}

function Notice({ tone, testId, children }: { tone: "danger" | "warning"; testId: string; children: React.ReactNode }) {
  const danger = tone === "danger";
  const Icon = danger ? AlertCircle : CalendarClock;
  return (
    <div
      role={danger ? "alert" : "status"}
      data-testid={testId}
      className={
        danger
          ? "flex gap-3 rounded-md border border-low/30 bg-low-bg px-4 py-3 text-sm text-low-text"
          : "flex gap-3 rounded-md border border-mid/30 bg-mid-bg px-4 py-3 text-sm text-mid-text"
      }
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div className="flex flex-col">{children}</div>
    </div>
  );
}

export function CreditsPanel({ buyHref, usageHref }: { buyHref: string; usageHref: string }) {
  return (
    <section aria-labelledby="credits-heading" className="rounded-md border border-border bg-surface p-5">
      <h2 id="credits-heading" className="text-base font-semibold tracking-[-0.02em]">
        Credits
      </h2>
      <p className="mt-3 text-sm text-muted-foreground">
        Plan credits reset each month. If you run low, top-up credits never expire.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button asChild>
          <Link href={buyHref}>Buy credits</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={usageHref}>See usage</Link>
        </Button>
      </div>
    </section>
  );
}

export function CancelPanel({ cancel, trialing }: { cancel: ChangeAction; trialing: boolean }) {
  return (
    <section aria-labelledby="cancel-heading" className="rounded-md border border-border bg-surface p-5">
      <h2 id="cancel-heading" className="text-base font-semibold tracking-[-0.02em]">
        Cancel plan
      </h2>
      <p className="mt-3 text-sm text-muted-foreground">
        {trialing
          ? "Your free trial keeps going until its end date, and you won't be charged."
          : "Your plan stops at the end of this billing period."}{" "}
        Your results stay visible, and you can keep your plan any time before then.
      </p>
      <CancelDialog
        label="Cancel plan"
        title="Before you cancel"
        keepLabel="Keep my plan"
        confirmLabel="Cancel anyway"
        reasonLabel="Why are you canceling? (optional)"
        action={cancel}
        className="mt-3 border-low/50 text-low-text hover:bg-low-bg hover:text-low-text"
      />
    </section>
  );
}

// BUG-079, BUG-066: both states lead to the Choose plan page, which starts the plan on this site.
export function NoPlan({ ended, choosePlanHref }: { ended: boolean; choosePlanHref: string }) {
  return (
    <section className="rounded-md border border-dashed border-border bg-surface px-6 py-10 text-center" data-testid="no-plan">
      <h2 className="text-base font-semibold tracking-[-0.02em]">{ended ? "Your plan has ended" : "You don't have a plan yet"}</h2>
      <p className="mx-auto mt-3 max-w-[440px] text-sm text-muted-foreground">
        {ended
          ? "Your results are still here to read. Choose a plan to start your scans again."
          : "Choose a plan for your businesses to keep your scans running."}
      </p>
      <Button asChild className="mt-3">
        <Link href={choosePlanHref}>{ended ? "Start your plan again" : "Choose a plan"}</Link>
      </Button>
    </section>
  );
}
