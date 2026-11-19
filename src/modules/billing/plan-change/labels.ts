// One set of words for moving a business between plans (BUG-238), shared by Billing and the last setup step, so
// the button always names the way the move goes from the plan the business is on. Pure, so client code imports it.

export type PlanLabelPlan = { id: string; name: string; priceCents: number };

/** A dearer plan is an upgrade (made now, D-57); any other is a move down (at the period end on Billing). */
export function planMove(current: Pick<PlanLabelPlan, "priceCents">, target: Pick<PlanLabelPlan, "priceCents">): "upgrade" | "downgrade" {
  return target.priceCents > current.priceCents ? "upgrade" : "downgrade";
}

/** "Upgrade to Pro" on Starter, "Move to Starter" on Pro. */
export function planMoveLabel(current: Pick<PlanLabelPlan, "priceCents">, target: Pick<PlanLabelPlan, "name" | "priceCents">): string {
  return planMove(current, target) === "upgrade" ? `Upgrade to ${target.name}` : `Move to ${target.name}`;
}

/** The plans a business can move to from its own, in price order, each with its button label. */
export function planMoves<P extends PlanLabelPlan>(currentId: string, plans: P[]): { plan: P; move: "upgrade" | "downgrade"; label: string }[] {
  const current = plans.find((p) => p.id === currentId);
  if (!current) return [];
  return plans
    .filter((p) => p.id !== currentId)
    .sort((a, b) => a.priceCents - b.priceCents)
    .map((plan) => ({ plan, move: planMove(current, plan), label: planMoveLabel(current, plan) }));
}
