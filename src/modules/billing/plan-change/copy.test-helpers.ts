import { doneCopy, previewCopy } from "./copy";
import type { PlanChange } from "./planner";

const changes: PlanChange[] = [
  { kind: "upgrade", businessId: "b", planId: "pro" },
  { kind: "add", businessId: "b", planId: "pro" },
  { kind: "downgrade", businessId: "b", planId: "starter" },
  { kind: "remove", businessId: "b" },
  { kind: "cancel" },
  { kind: "keep" },
];

/** Every message the copy module can produce, for wording checks. */
export function copyFor(): string[] {
  const texts: string[] = [];
  for (const change of changes) {
    for (const trialing of [false, true]) {
      const base = { change, businessName: "Acme", planName: "Pro", effectiveAt: 1_790_000_000 };
      const copy = previewCopy({ ...base, trialing, planPriceCents: 24900, amountCents: 5000, extraCredits: 650 });
      texts.push(copy.headline, ...copy.details, doneCopy({ ...base, trialing }));
    }
  }
  return texts;
}
