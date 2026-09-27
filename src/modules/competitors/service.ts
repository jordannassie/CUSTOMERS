import type { AlsoRecommendedList, ScoreReport, Standing } from "@/modules/scanning";
import type { PlaceSignals } from "./places";

// What the Competitors page shows (B-50, MVP_SPEC 7.1, 8.1, D-64). Pure, so every state is unit tested.

export type LeaderRow = {
  name: string;
  isYou: boolean;
  /** Rounded 0 to 100; null until a scan has checked this business. */
  score: number | null;
  standing: Standing | null;
  /** Grey shade for a competitor's bar: 1 is the strongest (DESIGN.md competitor-1 to 3). */
  shade: 1 | 2 | 3 | null;
};

export type SignalRow = {
  name: string;
  isYou: boolean;
  /** "linked": has a place id and Google answered; "missing": no place id or Google has no such place. */
  status: "linked" | "missing" | "error";
  signals: PlaceSignals | null;
};

export type CompetitorsView = {
  businessName: string;
  hasScore: boolean;
  /** Plus or minus this many points on your score (D-64). */
  margin: number | null;
  leaderboard: LeaderRow[];
  signals: SignalRow[];
  also: { name: string; answers: number }[];
  /** Answers the "also recommended" counts are out of. */
  answers: number;
  count: number;
  /** Null when the plan sets no limit. */
  limit: number | null;
};

export type CompetitorRow = { name: string; placesId: string | null; createdAt: Date };

export type SignalResult = PlaceSignals | null | "error";

export const STANDING_TEXT: Record<Standing, string> = {
  ahead: "You're ahead",
  behind: "You're behind",
  about_same: "About the same",
};

const key = (name: string) => name.trim().toLowerCase();

export function competitorsView(input: {
  business: { name: string; placesId: string | null };
  report: ScoreReport;
  competitors: CompetitorRow[];
  signals: Map<string, SignalResult>;
  also: AlsoRecommendedList;
  limit: number | null;
}): CompetitorsView {
  const { business, report, competitors, signals, also, limit } = input;
  const { overall } = report;
  const scored = new Map(report.competitors.map((c) => [key(c.name), c]));
  const lastCheck = report.lastCheckedAt?.getTime() ?? null;

  const rows: LeaderRow[] = competitors.map((c) => {
    const score = scored.get(key(c.name));
    // A competitor added after the last scan has no checks of its own yet, so a 0 would be wrong.
    const checked = score && lastCheck !== null && c.createdAt.getTime() <= lastCheck;
    return {
      name: c.name,
      isYou: false,
      score: checked ? Math.round(score.score) : null,
      standing: checked ? score.standing : null,
      shade: null,
    };
  });
  const ranked = rows.filter((r) => r.score !== null).sort((a, b) => b.score! - a.score! || a.name.localeCompare(b.name));
  ranked.forEach((r, i) => (r.shade = i === 0 ? 1 : i === 1 ? 2 : 3));
  const you: LeaderRow = { name: business.name, isYou: true, score: overall ? Math.round(overall.score) : null, standing: null, shade: null };
  const pending = rows.filter((r) => r.score === null);
  // Ties list you first, so an equal score never reads as losing.
  const leaderboard = overall
    ? [...ranked.filter((r) => r.score! > you.score!), you, ...ranked.filter((r) => r.score! <= you.score!), ...pending]
    : [you, ...rows];

  return {
    businessName: business.name,
    hasScore: overall !== null,
    margin: overall ? Math.round(overall.margin) : null,
    leaderboard,
    signals: [
      signalRow(business.name, true, business.placesId, signals),
      ...competitors.map((c) => signalRow(c.name, false, c.placesId, signals)),
    ],
    also: also.names,
    answers: also.answers,
    count: competitors.length,
    limit,
  };
}

function signalRow(name: string, isYou: boolean, placesId: string | null, signals: Map<string, SignalResult>): SignalRow {
  const result = placesId ? signals.get(placesId) : null;
  if (result === "error") return { name, isYou, status: "error", signals: null };
  if (!result) return { name, isYou, status: "missing", signals: null };
  return { name, isYou, status: "linked", signals: result };
}

const plural = (n: number, one: string, many: string) => `${n.toLocaleString("en-US")} ${n === 1 ? one : many}`;

/** "320 Google reviews, 4.7 stars", or "12 reviews, 4.2 stars" when Google was already named. */
export function reviewsText(s: Pick<PlaceSignals, "rating" | "reviewCount">, named = true): string {
  if (s.rating === null || !s.reviewCount) return named ? "No Google reviews yet" : "no reviews yet";
  return `${plural(s.reviewCount, named ? "Google review" : "review", named ? "Google reviews" : "reviews")}, ${s.rating.toFixed(1)} stars`;
}

/** "Bean House: 320 Google reviews, 4.7 stars. You: 12 reviews, 4.2 stars" (B-50). */
export function headToHead(them: SignalRow, you: SignalRow): string | null {
  if (!them.signals) return null;
  const theirs = `${them.name}: ${reviewsText(them.signals)}`;
  return you.signals ? `${theirs}. You: ${reviewsText(you.signals, false)}` : theirs;
}

/** "Open 7 days", "Open 5 days", or null when Google lists no hours. */
export function hoursText(hours: string[] | null): string | null {
  if (!hours) return null;
  const open = hours.filter((line) => !/:\s*closed\s*$/i.test(line)).length;
  return open === 0 ? "Closed all week" : `Open ${plural(open, "day", "days")} a week`;
}

/** "beanhouse.com" from "https://www.beanhouse.com/menu". */
export function websiteLabel(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function answersText(answers: number, total: number): string {
  return `Named in ${answers} of ${plural(total, "answer", "answers")}`;
}
