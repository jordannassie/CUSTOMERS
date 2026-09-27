// Shapes and formatting for the public pricing pages; no server imports, so components can use it.

export type PublicPlan = {
  id: string;
  name: string;
  priceCents: number;
  monthlyCredits: number;
  maxCompetitors: number | null;
  maxQuestions: number | null;
};

export type PublicPack = { id: string; credits: number; priceCents: number };

export type PublicPricing = { plans: PublicPlan[]; packs: PublicPack[] };

/** "$149", or "$149.50" when there are cents (WRITING.md: no trailing zeros). */
export function formatUsd(cents: number): string {
  const whole = cents % 100 === 0;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  }).format(cents / 100);
}

export function formatCount(n: number): string {
  return new Intl.NumberFormat("en-US").format(n);
}

// MVP_SPEC 4.3: scans per month for each schedule.
const SCANS_PER_MONTH = { daily: 30, weekly: 4.3, monthly: 1 } as const;

/** Credits a month for a business: questions × AI models × scans per month, rounded (MVP_SPEC 4.3). */
export function estimateMonthlyCredits(questions: number, models: number, schedule: keyof typeof SCANS_PER_MONTH): number {
  return Math.round(questions * models * SCANS_PER_MONTH[schedule]);
}
