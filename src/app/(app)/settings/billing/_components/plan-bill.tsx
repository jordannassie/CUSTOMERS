import Link from "next/link";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatUsd } from "@/modules/billing/format";
import type { BillingBusiness, BillingView } from "@/modules/billing";
import { ChangeDialog, type ChangeAction } from "./change-dialog";
import { longDate } from "./format";

export type PlanActions = { upgrade: ChangeAction; downgrade: ChangeAction; remove: ChangeAction; add: ChangeAction };

type Props = { view: BillingView; actions: PlanActions; addBusinessHref: string };

// The plan read like a bill: one line per business with its price, then the next charge as the total.
export function PlanBill({ view, actions, addBusinessHref }: Props) {
  const locked = !view.canChange || view.cancelAt !== null;
  const pastDue = view.status === "past_due";
  // Removing the last business that stays would leave an empty plan; cancelling is the way to stop paying.
  const staying = view.onPlan.filter((b) => b.pending?.kind !== "remove").length;

  return (
    <section aria-labelledby="plan-heading" className="rounded-md border border-border bg-surface">
      <div className="flex flex-wrap items-baseline justify-between gap-2 px-5 pt-5">
        <h2 id="plan-heading" className="text-base font-semibold tracking-[-0.02em]">
          Businesses on your plan
        </h2>
        <p className="text-[13px] text-muted-foreground">Each business is billed monthly on its own plan.</p>
      </div>

      {view.onPlan.length === 0 ? (
        <p className="mx-5 mt-4 rounded-md border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
          No businesses are on your plan yet. Add one below to start its scans.
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-border border-t border-border" data-testid="plan-lines">
          {view.onPlan.map((b) => (
            <BusinessLine
              key={b.id}
              business={b}
              view={view}
              actions={actions}
              locked={locked}
              pastDue={pastDue}
              canRemove={staying > 1}
            />
          ))}
        </ul>
      )}

      {view.notOnPlan.length > 0 && (
        <div className="border-t border-border px-5 py-4" data-testid="not-on-plan">
          <h3 className="text-sm font-medium">Not on your plan yet</h3>
          <ul className="mt-2 flex flex-col gap-3">
            {view.notOnPlan.map((b) => (
              <li key={b.id} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-sm">{b.name}</span>
                {pastDue && !locked && (
                  <span className="text-[13px] text-muted-foreground">Update your card first, then you can add it.</span>
                )}
                {!locked && !pastDue && (
                  <span className="flex flex-wrap gap-2">
                    {view.plans.map((p) => (
                      <ChangeDialog
                        key={p.id}
                        label={`Add on ${p.name}, ${formatUsd(p.priceCents)} a month`}
                        title={`Add ${b.name} on ${p.name}?`}
                        confirmLabel="Add to plan"
                        action={actions.add}
                        input={{ businessId: b.id, planId: p.id }}
                      />
                    ))}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="border-t border-border px-5 py-3">
        <Link
          href={addBusinessHref}
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-primary underline-offset-4 hover:underline"
        >
          <Plus className="size-3.5" aria-hidden="true" />
          Set up another business
        </Link>
      </div>

      <NextCharge view={view} />
    </section>
  );
}

function BusinessLine({
  business,
  view,
  actions,
  locked,
  pastDue,
  canRemove,
}: {
  business: BillingBusiness;
  view: BillingView;
  actions: PlanActions;
  locked: boolean;
  pastDue: boolean;
  canRemove: boolean;
}) {
  const { plan, pending } = business;
  const others = view.plans.filter((p) => p.id !== plan.id);
  return (
    <li className="px-5 py-4" data-testid={`plan-line-${business.id}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2">
            <span className="text-[15px] font-medium">{business.name}</span>
            <Badge variant="tint">{plan.name}</Badge>
          </p>
          <p className="mt-1 text-[13px] text-muted-foreground">
            {plan.monthlyCredits.toLocaleString("en-US")} credits a month
          </p>
          {pending && (
            <p className="mt-1.5 text-[13px] font-medium text-mid-text" data-testid="pending-change">
              {pending.kind === "remove"
                ? `Comes off your plan on ${longDate(pending.at)}`
                : `Moves to ${pending.planName} on ${longDate(pending.at)}`}
            </p>
          )}
        </div>
        <p className="shrink-0 text-right text-[15px] font-medium tabular-nums">
          {formatUsd(plan.priceCents)}
          <span className="block text-[13px] font-normal text-muted-foreground sm:inline"> a month</span>
        </p>
      </div>
      {!locked && (
        <div className="mt-3 flex flex-wrap gap-2">
          {others.map((p) =>
            p.priceCents > plan.priceCents ? (
              !pastDue && (
                <ChangeDialog
                  key={p.id}
                  label={`Upgrade to ${p.name}`}
                  title={`Upgrade ${business.name} to ${p.name}?`}
                  confirmLabel="Upgrade now"
                  action={actions.upgrade}
                  input={{ businessId: business.id, planId: p.id }}
                />
              )
            ) : (
              !(pending?.kind === "plan" && pending.planName === p.name) && (
                <ChangeDialog
                  key={p.id}
                  label={`Change to ${p.name}`}
                  title={`Move ${business.name} to ${p.name}?`}
                  confirmLabel={`Change to ${p.name}`}
                  action={actions.downgrade}
                  input={{ businessId: business.id, planId: p.id }}
                />
              )
            ),
          )}
          {canRemove && pending?.kind !== "remove" && (
            <ChangeDialog
              label="Remove"
              title={`Remove ${business.name} from your plan?`}
              confirmLabel="Remove from plan"
              action={actions.remove}
              input={{ businessId: business.id }}
              variant="ghost"
              tone="danger"
              className="text-low-text hover:bg-low-bg hover:text-low-text"
            />
          )}
        </div>
      )}
    </li>
  );
}

function NextCharge({ view }: { view: BillingView }) {
  let body: React.ReactNode;
  if (view.nextCharge) {
    const first = view.status === "trialing";
    body = (
      <>
        <div>
          <p className="text-sm font-medium">{first ? "First charge" : "Next charge"}</p>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            {longDate(view.nextCharge.at)}
            {first ? ", when your free trial ends" : ""}
          </p>
        </div>
        <p className="text-2xl font-semibold tracking-[-0.02em] tabular-nums" data-testid="next-charge">
          {formatUsd(view.nextCharge.amountCents)}
        </p>
      </>
    );
  } else if (view.cancelAt) {
    body = (
      <p className="text-sm text-muted-foreground">
        No more charges. Your {view.status === "trialing" ? "free trial" : "plan"} ends on {longDate(view.cancelAt)}.
      </p>
    );
  } else if (view.stripe === "error") {
    body = <p className="text-sm text-muted-foreground">We couldn&apos;t load your next charge. Refresh the page to try again.</p>;
  } else if (view.stripe === "unavailable") {
    body = (
      <p className="text-sm text-muted-foreground">
        Plan changes aren&apos;t available here right now. Contact us and we&apos;ll make the change for you.
      </p>
    );
  } else {
    return null;
  }
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 rounded-b-md border-t border-border bg-muted px-5 py-4" data-testid="charge-summary">
      {body}
    </div>
  );
}
