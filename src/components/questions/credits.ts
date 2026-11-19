import { estimateMonthlyCredits, type ScanFrequency } from "@/modules/credits/estimate";

// The same sum as onboarding and Settings, so all three show the same estimate.
export const monthlyCredits = estimateMonthlyCredits;

/** "About 13 more credits a month" for one question more (+1) or less (-1). */
export function creditChangeText(activeCount: number, change: 1 | -1, models: number, frequency: ScanFrequency): string {
  const diff = monthlyCredits(activeCount + change, models, frequency) - monthlyCredits(activeCount, models, frequency);
  const n = Math.abs(diff);
  return `About ${n} ${change > 0 ? "more" : "fewer"} ${n === 1 ? "credit" : "credits"} a month`;
}
