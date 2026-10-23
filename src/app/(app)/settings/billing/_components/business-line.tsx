import { Badge } from "@/components/ui/badge";
import { LocalDate } from "@/components/ui/local-date";
import { formatUsd } from "@/modules/billing/format";
import { planMoves } from "@/modules/billing/plan-change/labels";
import type { BillingBusiness, BillingView } from "@/modules/billing";
import { CancelDialog } from "./cancel-dialog";
import { ChangeDialog } from "./change-dialog";
import type { PlanActions } from "./plan-bill";
import { RemovedLine } from "./removed-line";

const SHORT_DATE: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };

// One business on the bill: its plan and price, a scheduled change, and the buttons that change it (D-57).
export function BusinessLine({
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
  if (business.notCharged) return <RemovedLine id={business.id} name={business.name} />;
  return (
    <li className="px-5 py-4" data-testid={`plan-line-${business.id}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2">
            <span className="text-[15px] font-medium">{business.name}</span>
            <Badge variant="tint">{plan.name}</Badge>
            {business.deleted && <Badge variant="secondary">Deleted</Badge>}
          </p>
          <p className="mt-1 text-[13px] text-muted-foreground">
            {plan.monthlyCredits.toLocaleString("en-US")} credits a month
          </p>
          {pending && (
            <p className="mt-1.5 text-[13px] font-medium text-mid-text" data-testid="pending-change">
              {pending.kind === "remove" ? (
                <>
                  Comes off your plan on <LocalDate iso={pending.at} />
                </>
              ) : (
                <>
                  Stays on {plan.name} until <LocalDate iso={pending.at} />, then moves to {pending.planName}
                </>
              )}
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
          {pending && (
            <ChangeDialog
              label={pending.kind === "remove" ? "Keep on plan" : `Keep ${plan.name}`}
              title={pending.kind === "remove" ? `Keep ${business.name} on your plan?` : `Keep ${business.name} on ${plan.name}?`}
              confirmLabel={pending.kind === "remove" ? "Keep on plan" : `Keep ${plan.name}`}
              action={actions.keep}
              input={{ businessId: business.id }}
              variant="default"
            />
          )}
          {/* A business that is leaving can only stay: moving it to another plan would mean nothing. The labels follow
              the plan it is on (planMoves), so a business on Pro is never offered "Upgrade to Pro" (BUG-238). */}
          {pending?.kind !== "remove" && planMoves(plan.id, view.plans).map(({ plan: p, move, label }) =>
            move === "upgrade" ? (
              !pastDue && (
                <ChangeDialog
                  key={p.id}
                  label={label}
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
                  // After the trial a move down waits for the renewal (D-57), so the button says when.
                  label={
                    view.renewsAt ? (
                      <>
                        {label} on <LocalDate iso={view.renewsAt} options={SHORT_DATE} />
                      </>
                    ) : (
                      label
                    )
                  }
                  title={view.renewsAt ? `Move ${business.name} to ${p.name} when your plan renews?` : `Move ${business.name} to ${p.name}?`}
                  confirmLabel={label}
                  action={actions.downgrade}
                  input={{ businessId: business.id, planId: p.id }}
                />
              )
            ),
          )}
          {canRemove && pending?.kind !== "remove" && (
            <CancelDialog
              label="Remove"
              title={`Before you remove ${business.name}`}
              keepLabel="Keep on plan"
              confirmLabel="Remove anyway"
              reasonLabel="Why are you removing it? (optional)"
              action={actions.remove}
              input={{ businessId: business.id }}
              variant="ghost"
              className="text-low-text hover:bg-low-bg hover:text-low-text"
            />
          )}
        </div>
      )}
    </li>
  );
}
