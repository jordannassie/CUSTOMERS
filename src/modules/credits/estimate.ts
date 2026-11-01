// Pure so the settings and onboarding forms can show the estimate live in the browser.

export type ScanFrequency = "daily" | "weekly" | "monthly";

// MVP_SPEC 4.3: scans per month for each schedule.
const SCANS_PER_MONTH: Record<ScanFrequency, number> = { daily: 30, weekly: 4.3, monthly: 1 };

/** Credits a month = questions x models x scans a month, rounded (12 x 3 weekly = 155). */
export function estimateMonthlyCredits(questions: number, models: number, frequency: ScanFrequency): number {
  return Math.round(questions * models * SCANS_PER_MONTH[frequency]);
}
