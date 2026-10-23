import type { PlanChange } from "./planner";

/** Stable per change and preview, so a double click or a retried request changes Stripe once. */
export function idempotencyKey(agencyId: string, change: PlanChange, prorationDate: number): string {
  const parts = [agencyId, change.kind];
  if ("businessId" in change) parts.push(change.businessId);
  if ("planId" in change) parts.push(change.planId);
  return `plan-change:${parts.join(":")}:${prorationDate}`;
}
