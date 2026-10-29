// Builds the version 2 report snapshot (the 10-page PDF) from loaded data. Pure: the reads are in v2/dal.ts. Every
// count comes from the score's own answers (standing/loadStanding), the place among tracked businesses from the
// leaderboard (placeAmongTracked) and the share of picks from standing/shares, so each number matches the app. No
// Google Places value is read or written here (D-73).
import { namedAs, placeAmongTracked, type LeaderRow } from "@/modules/competitors";
import { citations, pickCounts, shares, type StandingCheck } from "@/modules/standing";
import { analyse, type Rival } from "./analysis";
import { areaCards } from "./areas";
import { behindSection } from "./behind";
import { detectIssues, toFixes, topIssues } from "./issues";
import { knowsSection } from "./knows";
import { buildRoadmap } from "./roadmap";
import { reportSnapshotSchema, type ReportSnapshot } from "./snapshot-schema";
import { summarySection } from "./summary";
import { list, longDate, noLongDashes, percent } from "./text";

export type Excerpt = NonNullable<ReportSnapshot["knows"]["excerpts"]["named"]>;

export type BuildInput = {
  now: Date;
  /** The window the score covers (SCORE_WINDOW_DAYS). */
  days: number;
  agency: ReportSnapshot["agency"];
  business: { name: string; domain: string | null; market: string | null };
  /** Labels of the AI tools that answered ("ChatGPT", "Claude", "Perplexity"). */
  engines: string[];
  /** The app's 30-day score (scanning/loadScoreReport overall, rounded), its margin and its change on the 30 days before. */
  score: { value: number; margin: number | null; change: { direction: "up" | "down"; points: number } | null } | null;
  /** Scored answers only (standing/loadStanding). */
  checks: StandingCheck[];
  questions: Map<string, string>;
  /** The Competitors leaderboard (competitors/loadCompetitorsBase), you included. */
  leaderboard: LeaderRow[];
  /** Tracked competitor name to the website the user typed for it (never Google's, D-73). */
  competitorDomains: Map<string, string | null>;
  excerpts: { named: Excerpt | null; competitor: Excerpt | null };
  nextScanAt: string | null;
};

const DAY_MS = 86_400_000;
const isoDay = (d: Date) => d.toISOString().slice(0, 10);

/** The score from the answers themselves: named / all x 100, rounded once (D-91). */
export const pooledScore = (checks: StandingCheck[]) => percent(checks.filter((c) => c.youNamed).length, checks.length);

function rivalsOf(input: BuildInput): Rival[] {
  return input.leaderboard
    .filter((r) => !r.isYou)
    .map((r) => {
      const names = r.chain?.tracked ?? [r.name];
      return { name: namedAs(r), names, domain: input.competitorDomains.get(names[0]) ?? null, score: r.score, collecting: r.collecting };
    });
}

function businesses(input: BuildInput, value: number): ReportSnapshot["businesses"] {
  const rows = input.leaderboard.map((r) => ({ isYou: r.isYou, names: r.chain?.tracked ?? [r.name] }));
  const counts = pickCounts(input.checks, rows);
  return input.leaderboard
    .map((r, i) => ({ name: r.isYou ? input.business.name : namedAs(r), isYou: r.isYou, mentions: counts[i], score: r.isYou ? value : r.score }))
    .sort((x, y) => y.mentions - x.mentions || Number(y.isYou) - Number(x.isYou) || x.name.localeCompare(y.name));
}

function shareOfPicks(input: BuildInput): number | null {
  const rows = input.leaderboard;
  if (!rows.some((r) => !r.isYou)) return null;
  const picks = shares(input.checks, rows.map((r) => ({ isYou: r.isYou, names: r.chain?.tracked ?? [r.name] })));
  return picks[rows.findIndex((r) => r.isYou)] ?? null;
}

function methodText(input: BuildInput, questions: number, period: ReportSnapshot["period"]): string {
  const from = input.business.market ? `, from ${input.business.market}` : "";
  return [
    `We asked ${list(input.engines)} the same ${questions} questions local customers ask${from}, through each tool's official API with web search turned on.`,
    `That gave ${input.checks.length} answers between ${longDate(period.start)} and ${longDate(period.end)}.`,
    "We recorded every business named and every website used as a source.",
  ].join(" ");
}

/** Every string through the same dash rule, so a name typed with a long dash cannot break the wording rules. */
function clean<T>(value: T): T {
  if (typeof value === "string") return noLongDashes(value) as T;
  if (Array.isArray(value)) return value.map(clean) as T;
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, clean(v)])) as T;
  return value;
}

export function buildReportSnapshot(input: BuildInput): ReportSnapshot {
  const { business, checks } = input;
  const you = input.leaderboard.find((r) => r.isYou);
  const pooled = pooledScore(checks);
  // The app's score and "X of N" must be one number; when they ever differ, the count wins (dal.ts logs it).
  const value = input.score?.value === pooled ? input.score.value : pooled;
  const a = analyse({ business, checks, questions: input.questions, rivals: rivalsOf(input), youScore: you?.score ?? null });

  const top = topIssues(detectIssues(a));
  const fixes = toFixes(top);
  const behind = behindSection(a, top);
  const place = placeAmongTracked(input.leaderboard);
  const end = input.now;
  const period = { start: isoDay(new Date(end.getTime() - (input.days - 1) * DAY_MS)), end: isoDay(end), days: input.days };

  const snapshot: ReportSnapshot = {
    version: 2,
    preparedAt: input.now.toISOString(),
    period,
    agency: input.agency,
    business,
    coverage: { questions: a.questions, engines: input.engines, answers: a.total },
    score: {
      value,
      change: input.score?.change && input.score.change.points > 0 ? input.score.change : null,
      rangePoints: input.score?.margin ?? null,
    },
    named: { answers: a.named, total: a.total, questions: a.namedQuestions, questionsAsked: a.questions },
    rank:
      place && place.of > 1
        ? { position: place.place, of: place.of, leader: place.leader ? { name: namedAs(place.leader), score: place.leader.score! } : null }
        : null,
    ownSite: { hasSite: !!business.domain, cited: citations(checks, business.domain).cited, otherSites: a.otherSites },
    shareOfPicks: shareOfPicks(input),
    businesses: businesses(input, value),
    summary: summarySection(a, top, behind.reasons, value),
    knows: knowsSection(a, top, input.excerpts),
    behind,
    fixes,
    areas: areaCards(top),
    roadmap: buildRoadmap(fixes, { leader: place?.above ? namedAs(place.above) : null, nextScanAt: input.nextScanAt }),
    method: { text: methodText(input, a.questions, period) },
  };
  // Only the declared fields: what is stored is exactly what the PDF may show.
  return reportSnapshotSchema.parse(clean(snapshot));
}
