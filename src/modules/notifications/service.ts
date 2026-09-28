import type { LowCreditsLevel, WeeklyBusiness } from "@/modules/email";
import type { OverviewView } from "@/modules/overview";

// Pure rules for the scheduled emails (B-62, MVP_SPEC 10, D-37): unique keys, weeks and what the weekly report shows.

export type LowCreditAgency = {
  agencyId: string;
  level: LowCreditsLevel;
  used: number;
  total: number;
  balance: number;
  periodEnd: Date | null;
};

const DAY_MS = 86_400_000;

/** Once per level per credit period. Without plan credits the calendar month stands in for the period. */
export function lowCreditsKey(agency: Pick<LowCreditAgency, "agencyId" | "level" | "periodEnd">, now: Date): string {
  const period = agency.periodEnd ? agency.periodEnd.toISOString() : now.toISOString().slice(0, 7);
  return `low_credits:${agency.agencyId}:${period}:${agency.level}`;
}

/** The Monday (UTC) of the week `now` falls in, as YYYY-MM-DD. */
export function weekOf(now: Date): string {
  const daysSinceMonday = (now.getUTCDay() + 6) % 7;
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - daysSinceMonday * DAY_MS);
  return monday.toISOString().slice(0, 10);
}

export function weeklyReportKey(agencyId: string, now: Date): string {
  return `weekly_report:${agencyId}:${weekOf(now)}`;
}

export const welcomeKey = (agencyId: string) => `welcome:${agencyId}`;

export type NewOpportunity = { title: string; impact: "high" | "medium" | "low"; createdAt: string };

const IMPACT_ORDER = { high: 0, medium: 1, low: 2 } as const;
export const MAX_NEW_OPPORTUNITIES = 3;

/**
 * One business in the weekly report. The Overview already drops score changes inside the margin of error,
 * so a change shown here is always a real one (D-63: a mention rate, never a rank).
 */
export function weeklyBusiness(input: {
  name: string;
  overview: Pick<OverviewView, "score"> | null;
  newOpportunities: NewOpportunity[];
  /** The share page path (/r/...), or the dashboard when the agency turned the business's link off. */
  reportPath: string;
}): WeeklyBusiness {
  const score = input.overview?.score ?? null;
  const sorted = [...input.newOpportunities].sort(
    (a, b) => IMPACT_ORDER[a.impact] - IMPACT_ORDER[b.impact] || b.createdAt.localeCompare(a.createdAt),
  );
  return {
    name: input.name,
    score: score?.value ?? null,
    sentence: score?.sentence ?? null,
    change: score?.change ?? null,
    newOpportunities: sorted.slice(0, MAX_NEW_OPPORTUNITIES).map((o) => o.title),
    moreOpportunities: Math.max(0, sorted.length - MAX_NEW_OPPORTUNITIES),
    reportUrl: input.reportPath,
  };
}

/** Nothing to say until at least one business has a score. */
export function hasSomethingToReport(businesses: WeeklyBusiness[]): boolean {
  return businesses.some((b) => b.score !== null);
}

export function weeklyReportSubject(businesses: WeeklyBusiness[]): string {
  const changed = businesses.filter((b) => b.change).length;
  if (businesses.length === 1) return `Your weekly report for ${businesses[0].name}`;
  if (changed === 0) return `Your weekly report: ${businesses.length} businesses, no big moves`;
  return `Your weekly report: ${changed} of ${businesses.length} businesses moved`;
}

const RENEWAL = new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", timeZone: "UTC" });

export function renewalDate(periodEnd: Date | null): string | null {
  return periodEnd ? RENEWAL.format(periodEnd) : null;
}
