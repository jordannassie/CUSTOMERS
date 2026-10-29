import { utcDate } from "@/lib/time-zone";
import type { LowCreditsLevel, WeeklyBusiness } from "@/modules/email";
import type { ReportSnapshot } from "@/modules/reports";

// Pure rules for the scheduled emails (B-62, MVP_SPEC 10, D-37): unique keys, weeks and what the weekly report shows.

export type LowCreditAgency = {
  agencyId: string;
  level: LowCreditsLevel;
  used: number;
  total: number;
  balance: number;
  /** The renewal date the email shows. It can move inside one period, so the key never uses it (BUG-280). */
  periodEnd: Date | null;
  /** The expiry of the newest plan or trial grant: the same all through one credit period. */
  periodKey: Date | null;
  /** When that period's credits were granted; no low credits email at the same level since then. */
  periodStartedAt: Date | null;
};

const DAY_MS = 86_400_000;

/** "zero" covers at zero and below: one email when the credits run out, not a second one below zero. */
export type LowCreditsGroup = "low" | "zero";

export const lowCreditsGroup = (level: string): LowCreditsGroup => (level === "low" ? "low" : "zero");

/** Once per level group per credit period. Without plan credits the calendar month stands in for the period. */
export function lowCreditsKey(agency: Pick<LowCreditAgency, "agencyId" | "level" | "periodKey">, now: Date): string {
  const period = agency.periodKey ? agency.periodKey.toISOString() : now.toISOString().slice(0, 7);
  return `low_credits:${agency.agencyId}:${period}:${lowCreditsGroup(agency.level)}`;
}

/** The level group a stored key was sent for: old keys end in low, empty or negative, new ones in low or zero. */
export function lowCreditsKeyGroup(key: string): LowCreditsGroup | null {
  const level = key.slice(key.lastIndexOf(":") + 1);
  return ["low", "empty", "negative", "zero"].includes(level) ? lowCreditsGroup(level) : null;
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

/** The report fixes each business lists, as the PDF's first fixes. */
export const MAX_FIXES = 3;

/** Thrown between businesses when a run's time is up: the agency is left for the next run, not counted as failed. */
export class OutOfTime extends Error {
  constructor() {
    super("The email job ran out of time on this agency.");
  }
}

const AI_TOOLS: [string, string][] = [
  ["openai", "ChatGPT"],
  ["anthropic", "Claude"],
  ["perplexity", "Perplexity"],
];

/** The business's chosen AI tools by name, in the usual order; all three for a business with none saved. */
export function aiToolNames(models: string[] | null | undefined): string[] {
  const chosen = AI_TOOLS.filter(([id]) => models?.includes(id)).map(([, name]) => name);
  return chosen.length > 0 ? chosen : AI_TOOLS.map(([, name]) => name);
}

/** One business in the weekly report, with the report its numbers came from (null before the first counted answer). */
export type ReportedBusiness = WeeklyBusiness & { snapshot: ReportSnapshot | null };

const points = (n: number) => `${n} ${n === 1 ? "point" : "points"}`;

/**
 * One business in the weekly report (D-90): every number from its current report, so the email, the share link and
 * the PDF agree. The report already drops score changes inside the margin of error (D-63: a mention rate, never a rank).
 */
export function weeklyBusiness(input: {
  name: string;
  snapshot: ReportSnapshot | null;
  /** The share link path (/r/...), which opens the PDF, or null when the agency turned the business's link off. */
  sharePath: string | null;
  /** The AI tools chosen for the business (businesses.models), e.g. ["openai", "anthropic"]. */
  models?: string[] | null;
}): ReportedBusiness {
  const s = input.snapshot;
  const change = s?.score.change ?? null;
  return {
    name: input.name,
    score: s?.score.value ?? null,
    named: s ? { answers: s.named.answers, total: s.named.total } : null,
    rank: s?.rank ? { position: s.rank.position, of: s.rank.of } : null,
    sentence: s?.summary.headline ?? null,
    reason: s?.summary.short.behind ?? null,
    change: change && { direction: change.direction, text: `${change.direction === "up" ? "Up" : "Down"} ${points(change.points)} on the 30 days before` },
    fixes: (s?.fixes ?? []).slice(0, MAX_FIXES).map((f) => ({ title: f.title, where: f.where })),
    moreFixes: Math.max(0, (s?.fixes.length ?? 0) - MAX_FIXES),
    reportUrl: s && input.sharePath ? input.sharePath : "/dashboard",
    pdf: !!(s && input.sharePath),
    aiTools: aiToolNames(input.models),
    snapshot: s,
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

/** "October 2 (UTC)": an email does not know the reader's zone, so it says which one it uses (BUG-070). */
export function renewalDate(periodEnd: Date | null): string | null {
  return periodEnd ? utcDate(periodEnd) : null;
}
