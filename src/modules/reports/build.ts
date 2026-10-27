// Builds the report document from what the Overview, Competitors and Questions pages already work out, so every number
// matches those pages. Pure: the reads are in live/dal.ts.
import type { CompetitorsView, LeaderRow } from "@/modules/competitors";
import type { OverviewView } from "@/modules/overview";
import type { StandingCheck } from "@/modules/standing";
import { reportDocumentSchema, type CompetitorLine, type ModelLine, type QuestionLine, type ReportDocument } from "./document";
import { actionRows, citations, questionRows, shares, sourceRows, type OpenFix } from "./facts";
import { reportSummary } from "./service";

export type DocumentInput = {
  business: { name: string; domain: string | null; place: string | null; paused: boolean };
  now: Date;
  windowDays: number;
  overview: OverviewView;
  competitors: Pick<CompetitorsView, "leaderboard">;
  /** Scored answers only (standing/loadStanding): the user's own questions are left out. */
  checks: StandingCheck[];
  /** Suggested questions, with their weekly cells (scanning/loadQuestionTrends). */
  questions: { id: string; prompt: string; cells: ({ named: number; checked: number; change: "up" | "down" | "same" | null } | null)[] }[];
  /** The top likely reason per leaderboard name, from saved answers only. */
  reasons: Map<string, string>;
  /** The Overview's likely reason sentence (competitors whySentence). */
  reason: string | null;
  fixes: OpenFix[];
};

const inTen = (score: number) => {
  const n = Math.round(score / 10);
  return n === 0 ? (score > 0 ? "fewer than 1 of 10" : null) : `about ${n} of 10`;
};

export function summaryHeadline(name: string, score: number | null): string {
  if (score === null) return `No score yet for ${name}`;
  const share = inTen(score);
  return share ? `AI recommends ${name} in ${share} customer questions` : `AI did not recommend ${name} in any customer questions`;
}

/** "#3 of 5 tracked businesses": the place among tracked businesses by score, never a rank in AI (D-63). */
export function rankOf(rows: LeaderRow[]): ReportDocument["summary"]["rank"] {
  const you = rows.find((r) => r.isYou);
  if (!you || you.score === null) return null;
  const ranked = rows.filter((r) => !r.isYou && r.score !== null && !r.collecting);
  const position = 1 + ranked.filter((r) => r.score! > you.score!).length;
  const top = [...ranked].sort((a, b) => b.score! - a.score!)[0];
  const leader = top && top.score! > you.score! ? { name: top.chain?.brand ?? top.name, score: top.score! } : null;
  return { position, total: ranked.length + 1, leader };
}

// Scores this close read as level across AI tools.
const LEVEL_POINTS = 10;

export function modelsHeadline(rows: ModelLine[]): string {
  const scored = rows.filter((r) => r.score !== null).sort((a, b) => b.score! - a.score!);
  if (scored.length === 0) return "No AI tool has a score yet";
  if (scored.length === 1) return `Only ${scored[0].label} has a score so far`;
  const best = scored[0];
  const worst = scored.at(-1)!;
  if (best.score! - worst.score! < LEVEL_POINTS) return "Each AI tool recommends you about as often";
  return worst.score === 0 ? `${best.label} recommends you most, ${worst.label} did not at all` : `${best.label} recommends you most, ${worst.label} least`;
}

const list = (names: string[]) => (names.length <= 2 ? names.join(" and ") : `${names.slice(0, 2).join(", ")} and ${names.length - 2} more`);

export function competitorsHeadline(rows: CompetitorLine[]): string {
  const others = rows.filter((r) => !r.isYou);
  if (others.length === 0) return "No competitors tracked yet";
  const behind = others.filter((r) => r.standing === "behind").map((r) => r.name);
  if (behind.length > 0) return `${list(behind)} ${behind.length === 1 ? "is" : "are"} recommended more often`;
  const compared = others.filter((r) => r.standing !== null);
  if (compared.length === 0) return "Not enough answers yet to compare";
  return compared.every((r) => r.standing === "ahead") ? "You are recommended more often than every tracked competitor" : "No competitor is clearly ahead of you";
}

export function questionsHeadline(rows: QuestionLine[]): string {
  const asked = rows.filter((r) => r.answers > 0);
  if (asked.length === 0) return "No answers yet";
  return `Recommended in ${asked.filter((r) => r.named > 0).length} of ${asked.length} questions`;
}

function competitorLines(input: DocumentInput): CompetitorLine[] {
  const rows = input.competitors.leaderboard;
  const picks = shares(input.checks, rows.map((r) => ({ isYou: r.isYou, names: r.chain?.tracked ?? [r.name] })));
  return rows.map((r, i) => ({
    name: r.chain ? `${r.chain.brand} (all locations)` : r.name,
    isYou: r.isYou,
    score: r.score,
    share: r.score === null || r.collecting ? null : picks[i],
    standing: r.standing,
    collecting: r.collecting,
    reason: r.isYou ? null : (input.reasons.get(r.name) ?? null),
  }));
}

const isoDay = (d: Date) => d.toISOString().slice(0, 10);

export function buildDocument(input: DocumentInput): ReportDocument {
  const { overview, business, checks } = input;
  const score = overview.score;
  const competitors = competitorLines(input);
  const questions = questionRows(input.questions, checks);
  const actions = actionRows(input.fixes);
  const doc: ReportDocument = {
    version: 1,
    businessName: business.name,
    domain: business.domain,
    place: business.place,
    preparedAt: input.now.toISOString(),
    windowDays: input.windowDays,
    questionCount: input.questions.length,
    lastScanAt: overview.lastCheckedAt,
    paused: business.paused,
    summary: {
      headline: summaryHeadline(business.name, score?.value ?? null),
      score: score && { value: score.value, label: score.label, tone: score.tone },
      rank: rankOf(input.competitors.leaderboard),
      citations: citations(checks, business.domain),
      lines: reportSummary({
        businessName: business.name,
        score: score?.value ?? null,
        monthChange: overview.monthChange,
        leaderboard: input.competitors.leaderboard,
        firstFix: actions[0]?.title ?? null,
        reason: input.reason,
      }),
    },
    models: {
      headline: modelsHeadline(overview.models),
      rows: overview.models.map(({ id, label, score: s, notChecked, skipped, change }) => ({ id, label, score: s, notChecked, skipped, change })),
    },
    competitors: { headline: competitorsHeadline(competitors), rows: competitors, hasReasons: competitors.some((c) => c.reason) },
    questions: { headline: questionsHeadline(questions), rows: questions },
    sources: { headline: "The sites AI used most in its answers", answers: checks.length, rows: sourceRows(checks, business.domain) },
    actions: { rows: actions },
  };
  // Only the declared fields: what is stored in a snapshot is exactly what a page may show.
  return reportDocumentSchema.parse(doc);
}

/** The 30 days a document covers, as the reports table stores them. */
export function documentPeriod(doc: Pick<ReportDocument, "preparedAt" | "windowDays">): { start: string; end: string } {
  const end = new Date(doc.preparedAt);
  return { start: isoDay(new Date(end.getTime() - (doc.windowDays - 1) * 86_400_000)), end: isoDay(end) };
}
