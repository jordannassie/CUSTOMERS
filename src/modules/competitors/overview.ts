// The Overview's competitor blocks (dashboard redesign, 2026-10-27): where you stand, your share of AI picks, each AI
// tool's leaders, the per-scan chart against the leader, and the period counts behind the KPI strip. Pure, from the
// same score report and leaderboard as the Competitors page.
import type { ProviderId, ScoreReport } from "@/modules/scanning";
import { citations, shares, siteRows, type SiteRow, type StandingCheck } from "@/modules/standing";
import { namedAs, rowName } from "./chain";
import { placeAmongTracked } from "./rank";
import type { CompetitorsView, LeaderRow } from "./service";

const STAND_ROWS = 4;
/** Competitors drawn on the Overview chart besides you: five lines in all, each its own color. */
const MAX_LINES = 4;
const LABELS: Record<string, string> = { openai: "ChatGPT", anthropic: "Claude", perplexity: "Perplexity" };
const round = (n: number | null | undefined) => (n === null || n === undefined ? null : Math.round(n));

export type OverviewCompete = {
  /** Up to 4 businesses by score, you always among them. */
  stand: { name: string; isYou: boolean; score: number; standing: LeaderRow["standing"] }[];
  /** Your share of every naming of you or a tracked competitor (as the report counts it), and your place by score. */
  share: { percent: number; rank: number; of: number } | null;
  /** Answers that cited your own website, as the report counts them; null without the score's answers. */
  ownSite: { cited: number; answers: number; hasSite: boolean } | null;
  /** The sites AI used most, counted like the report's "Where AI looks"; null without the score's answers. */
  sites: SiteRow[] | null;
  /** "Pizza Hut 75 · Domino's 15": the two competitors each AI tool named most. */
  modelContext: Partial<Record<ProviderId, string>>;
  /** You, then up to 4 competitors by score; `key` is the timeline's field for each. */
  lines: { key: string; name: string; isYou: boolean; latest: number | null }[];
  /** Each scan's own rate for every line (s0 is you), and your 30-day score then (rolling, dashed). */
  timeline: ({ label: string; rolling: number | null } & Record<string, number | string | null>)[];
  leaderName: string | null;
  period: { days: number; answers: number; named: number; prevAnswers: number; prevNamed: number } | null;
  /** Scans before the range exist, so a short range with one scan says to pick a longer one, not to wait. */
  earlierScans: boolean;
  /** The share of answers that named you against the days before, so a range with more answers never reads as a gain. */
  periodChange: PeriodChange | null;
};

export type PeriodChange = { direction: "up" | "down" | "same"; text: string };

const rate = (named: number, answers: number) => Math.round((100 * named) / answers);

/** "25% of answers, up from 20% the 7 days before": rates, not counts. Null without answers in both ranges. */
export function periodChange(p: OverviewCompete["period"]): PeriodChange | null {
  if (!p || p.answers === 0 || p.prevAnswers === 0) return null;
  const now = rate(p.named, p.answers);
  const before = rate(p.prevNamed, p.prevAnswers);
  if (now === before) return { direction: "same", text: `${now}% of answers, the same as the ${p.days} days before` };
  return { direction: now > before ? "up" : "down", text: `${now}% of answers, ${now > before ? "up" : "down"} from ${before}% the ${p.days} days before` };
}

const dayLabel = (date: string) => new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

/** Answers in the days before the range, or a scan in the 30-day window older than the range's first day. */
function earlierScans(report: ScoreReport, period: OverviewCompete["period"]): boolean {
  if (period && period.prevAnswers > 0) return true;
  const first = report.charts?.timeline[0]?.date;
  return !!report.firstCheckedAt && (!first || report.firstCheckedAt.toISOString().slice(0, 10) < first);
}

/** `standing` is the score's own answers with your website (standing module), for the share and citations. */
export function overviewCompete(view: CompetitorsView, report: ScoreReport, standing?: { checks: StandingCheck[]; domain: string | null } | null): OverviewCompete {
  const charts = report.charts ?? null;
  const ranked = view.leaderboard.filter((r) => r.score !== null && !r.collecting);
  const top = ranked.slice(0, STAND_ROWS);
  const you = ranked.find((r) => r.isYou);
  const stand = (you && !top.includes(you) ? [...top.slice(0, STAND_ROWS - 1), you] : top).map((r) => ({
    name: r.isYou ? r.name : rowName(r),
    isYou: r.isYou,
    score: r.score!,
    standing: r.standing,
  }));
  const leader = ranked.find((r) => !r.isYou) ?? null;
  const shown = ranked.filter((r) => !r.isYou).slice(0, MAX_LINES);
  const at = (r: LeaderRow) => (r.isYou ? 0 : (charts?.names.indexOf(r.name) ?? -1));
  const lineRows = [...(you ? [you] : []), ...shown].filter((r) => at(r) >= 0);
  const lastScan = charts?.timeline.at(-1);
  const lines = lineRows.map((r, i) => ({
    key: `s${i}`,
    name: r.isYou ? r.name : rowName(r),
    isYou: r.isYou,
    latest: lastScan ? round(lastScan.scores[at(r)]) : null,
  }));

  // The same share, place and citations as the report: share over the score's answers, place by score (rank.ts).
  let share: OverviewCompete["share"] = null;
  const place = placeAmongTracked(view.leaderboard);
  // With no competitor tracked there is nothing to share with: "Track competitors to compare", never "100%".
  const tracksAny = view.leaderboard.some((r) => !r.isYou);
  if (tracksAny && standing && place) {
    const rows = view.leaderboard;
    const picks = shares(standing.checks, rows.map((r) => ({ isYou: r.isYou, names: r.chain?.tracked ?? [r.name] })));
    const mine = picks[rows.findIndex((r) => r.isYou)];
    if (mine !== null && mine !== undefined) share = { percent: mine, rank: place.place, of: place.of };
  } else if (tracksAny && charts && place && charts.share.some((s) => s.mentions > 0)) {
    // Without the score's answers (an older caller), the chart's own count; the place is still by score.
    share = { percent: Math.round(charts.share[0].share), rank: place.place, of: place.of };
  }
  const ownSite = standing ? citations(standing.checks, standing.domain) : null;
  const sites = standing ? siteRows(standing.checks, standing.domain, 8) : null;

  // One entry per leaderboard row, by the name AI uses (a chain once, as "Bennu Coffee"); competitors still
  // collecting are left out, as everywhere else they are compared.
  const compared = view.leaderboard.filter((r) => !r.isYou && !r.collecting && r.score !== null);
  const modelContext: OverviewCompete["modelContext"] = {};
  for (const m of charts?.byModel ?? []) {
    const named = compared
      .map((r) => ({ name: namedAs(r), score: round(m.scores[at(r)]) }))
      .filter((x): x is { name: string; score: number } => x.score !== null && x.score !== undefined)
      .sort((a, b) => b.score - a.score)
      .slice(0, 2);
    if (named.length > 0) modelContext[m.model] = named.map((x) => `${x.name} ${x.score}`).join(" · ");
  }
  const period = charts?.period
    ? { days: charts.period.days, answers: charts.period.answers, named: charts.period.named[0], prevAnswers: charts.period.prevAnswers, prevNamed: charts.period.prevNamed[0] }
    : null;

  return {
    stand,
    share,
    ownSite,
    sites,
    modelContext,
    lines,
    timeline: (charts?.timeline ?? []).map((p) => ({
      label: dayLabel(p.date),
      rolling: round(p.rolling[0]),
      ...Object.fromEntries(lineRows.map((r, i) => [`s${i}`, round(p.scores[at(r)])])),
    })),
    leaderName: leader ? rowName(leader) : null,
    period,
    earlierScans: earlierScans(report, period),
    periodChange: periodChange(period),
  };
}

export const modelLabel = (id: string) => LABELS[id] ?? id;
