import Link from "next/link";
import { AlertCircle, CalendarClock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatUsd } from "@/modules/billing/format";
import type { BillingView } from "@/modules/billing";
import { ChangeDialog, type ChangeAction } from "./change-dialog";
import { longDate } from "./format";

const STATUS: Record<string, { label: string; variant: "tint" | "good" | "low" | "secondary" }> = {
  trialing: { label: "Free trial", variant: "tint" },
  active: { label: "Active", variant: "good" },
  past_due: { label: "Payment failed", variant: "low" },
  canceled: { label: "Ended", variant: "secondary" },
};

export function PlanStatus({ view, keep }: { view: BillingView; keep: ChangeAction }) {
  const status = STATUS[view.status] ?? { label: "Active", variant: "good" as const };
  const monthly = view.onPlan.reduce((sum, b) => sum + b.plan.priceCents, 0);

  return (
    <div className="flex flex-col gap-3">
      <p className="flex flex-wrap items-center gap-2 text-sm" data-testid="plan-status">
        <Badge variant={status.variant}>{status.label}</Badge>
        {view.status === "trialing" && view.trialEndsAt && (
          <span className="text-muted-foreground">
            Your free trial ends on {longDate(view.trialEndsAt)}. Cancel before then and you won&apos;t be charged.
          </span>
        )}
        {view.status === "active" && monthly > 0 && (
          <span className="text-muted-foreground">
            {view.onPlan.length === 1 ? "1 business" : `${view.onPlan.length} businesses`} for {formatUsd(monthly)} a month.
          </span>
        )}
      </p>

      {view.status === "past_due" && (
        <Notice tone="danger" testId="past-due-notice">
          Your last payment didn&apos;t go through, so automatic scans are paused. Use Manage card and invoices to update
          your card, and we&apos;ll try the payment again.
        </Notice>
      )}
      {view.cancelAt && (
        <Notice tone="warning" testId="cancel-notice">
          <span>
            Your plan ends on {longDate(view.cancelAt)}. Your plan credits work until then, and you won&apos;t be charged again.
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
      <p className="mt-1 text-sm text-muted-foreground">
        Plan credits reset each month. If you run low, top-up credits never expire.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
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

export function CancelPanel({ cancel }: { cancel: ChangeAction }) {
  return (
    <section aria-labelledby="cancel-heading" className="rounded-md border border-border bg-surface p-5">
      <h2 id="cancel-heading" className="text-base font-semibold tracking-[-0.02em]">
        Cancel plan
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Your plan stops at the end of this billing period. Your results stay visible, and you can keep your plan any time
        before then.
      </p>
      <ChangeDialog
        label="Cancel plan"
        title="Cancel your plan?"
        confirmLabel="Cancel plan"
        action={cancel}
        tone="danger"
        className="mt-4 border-low/50 text-low-text hover:bg-low-bg hover:text-low-text"
      />
    </section>
  );
}

export function NoPlan({ ended, setupHref, supportHref }: { ended: boolean; setupHref: string; supportHref: string }) {
  return (
    <section className="rounded-md border border-dashed border-border bg-surface px-6 py-10 text-center" data-testid="no-plan">
      <h2 className="text-base font-semibold tracking-[-0.02em]">{ended ? "Your plan has ended" : "You don't have a plan yet"}</h2>
      <p className="mx-auto mt-2 max-w-[440px] text-sm text-muted-foreground">
        {ended
          ? "Your results are still here to read. Contact us to start your plan again."
          : "Finish setup to start your 7-day free trial. You choose a plan for each business there."}
      </p>
      <Button asChild className="mt-5">
        <Link href={ended ? supportHref : setupHref}>{ended ? "Contact us" : "Finish setup"}</Link>
      </Button>
    </section>
  );
}
