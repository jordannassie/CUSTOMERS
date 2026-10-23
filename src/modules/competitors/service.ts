import { pointsChange, type PointsChange } from "@/modules/overview";
import type { AlsoRecommendedList, ScoreReport, Standing } from "@/modules/scanning";
import { mergeChains, type ChainOf } from "./chain";
import type { CompetitorChartsView } from "./charts";
import type { PlaceSignals } from "./places";

// What the Competitors page shows (B-50, MVP_SPEC 7.1, 8.1, D-64). Pure, so every state is unit tested.

export type LeaderRow = {
  name: string;
  isYou: boolean;
  /** Rounded 0 to 100; null until a scan has checked this business. */
  score: number | null;
  standing: Standing | null;
  /** Added partway through the 30-day window, so older checks never looked for it (F-53): no standing yet. */
  collecting: boolean;
  /** Weekly change, only outside the margin and never for a competitor still collecting (DB-013). */
  change: PointsChange | null;
  /** Grey shade for a competitor's bar: 1 is the strongest (DESIGN.md competitor-1 to 3). */
  shade: 1 | 2 | 3 | null;
  /** Set when the score is a chain's, not the tracked branch's: show rowName() and trackedNote() (chain.ts). */
  chain?: ChainOf | null;
};

export type SignalRow = {
  name: string;
  isYou: boolean;
  /**
   * "linked": has a place id and Google answered; "missing": no place id or Google has no such place; "limited":
   * Google's request limit for the day was reached.
   */
  status: "linked" | "missing" | "error" | "limited";
  signals: PlaceSignals | null;
  /** The tracked competitor's id, for "Add website"; null for your own row. */
  competitorId?: string | null;
  /** A website the user typed for this competitor (user data, never Google's, D-73). */
  savedSite?: string | null;
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
  /** A chain with no branch picked on Google yet: your row links to "Pick your branch on Google" (step 6d). */
  pickBranch: boolean;
  /** The page's charts (charts.ts); only the Competitors page asks for them. */
  charts?: CompetitorChartsView | null;
};

/**
 * `countedFrom`: the first saved answer checked for this competitor. When it was added, unless saved answers were
 * checked again for it since (BUG-122), which reaches back to the oldest answer still shown.
 */
export type CompetitorRow = { name: string; placesId: string | null; countedFrom: Date; id?: string; domain?: string | null };

export type SignalResult = PlaceSignals | null | "error" | "limited";

export const STANDING_TEXT: Record<Standing, string> = {
  ahead: "You're ahead",
  behind: "You're behind",
  about_same: "About the same",
};

export const COLLECTING_TEXT = "New, still collecting";

const key = (name: string) => name.trim().toLowerCase();

export function competitorsView(input: {
  business: { name: string; placesId: string | null; chain?: boolean };
  report: ScoreReport;
  competitors: CompetitorRow[];
  signals: Map<string, SignalResult>;
  also: AlsoRecommendedList;
  limit: number | null;
}): CompetitorsView {
  const { business, report, competitors, signals, also, limit } = input;
  const { overall } = report;
  const scored = new Map(report.competitors.map((c) => [key(c.name), c]));
  const firstCheck = report.firstCheckedAt?.getTime() ?? null;
  const lastCheck = report.lastCheckedAt?.getTime() ?? null;
  const weekAgoStart = firstCheck === null ? null : firstCheck - 7 * 86_400_000;

  const tracked: LeaderRow[] = competitors.map((c) => {
    const score = scored.get(key(c.name));
    // A competitor added after the last scan has no checks of its own yet, so a 0 would be wrong.
    const checked = score && lastCheck !== null && c.countedFrom.getTime() <= lastCheck;
    const collecting = !!checked && firstCheck !== null && c.countedFrom.getTime() > firstCheck;
    return {
      name: c.name,
      isYou: false,
      score: checked ? Math.round(score.score) : null,
      standing: checked && !collecting ? score.standing : null,
      // The change compares with the 30-day score a week ago, whose window starts 7 days before this one; checks
      // from before a competitor was added never looked for it, so a newer one could show a false rise.
      change: checked && !collecting && weekAgoStart !== null && c.countedFrom.getTime() <= weekAgoStart ? pointsChange(score.change) : null,
      collecting,
      shade: null,
      chain: checked && score.chain ? { brand: score.chain, tracked: [c.name] } : null,
    };
  });
  // Two tracked branches of one chain share the same answers, so the chain is shown once.
  const rows = mergeChains(tracked);
  const byScore = (a: LeaderRow, b: LeaderRow) => b.score! - a.score! || a.name.localeCompare(b.name);
  const ranked = rows.filter((r) => r.score !== null && !r.collecting).sort(byScore);
  ranked.forEach((r, i) => (r.shade = i === 0 ? 1 : i === 1 ? 2 : 3));
  // A partial score is not placed above or below you until it covers the whole window.
  const collecting = rows.filter((r) => r.collecting).sort(byScore);
  const you: LeaderRow = {
    name: business.name,
    isYou: true,
    score: overall ? Math.round(overall.score) : null,
    standing: null,
    change: pointsChange(report.change),
    collecting: false,
    shade: null,
  };
  const pending = rows.filter((r) => r.score === null);
  // Ties list you first, so an equal score never reads as losing.
  const leaderboard = overall
    ? [...ranked.filter((r) => r.score! > you.score!), you, ...ranked.filter((r) => r.score! <= you.score!), ...collecting, ...pending]
    : [you, ...rows];

  return {
    businessName: business.name,
    hasScore: overall !== null,
    margin: overall ? Math.round(overall.margin) : null,
    leaderboard,
    signals: signalRows(business, competitors, signals),
    also: also.names,
    answers: also.answers,
    count: competitors.length,
    limit,
    pickBranch: !!business.chain && !business.placesId,
  };
}

/** "Side by side on Google": your row, then each competitor's, from the live Places answers by place id. */
export function signalRows(
  business: { name: string; placesId: string | null },
  competitors: CompetitorRow[],
  signals: Map<string, SignalResult>,
): SignalRow[] {
  return [
    signalRow(business.name, true, business.placesId, signals),
    ...competitors.map((c) => ({ ...signalRow(c.name, false, c.placesId, signals), competitorId: c.id ?? null, savedSite: c.domain ?? null })),
  ];
}

function signalRow(name: string, isYou: boolean, placesId: string | null, signals: Map<string, SignalResult>): SignalRow {
  const result = placesId ? signals.get(placesId) : null;
  if (result === "error" || result === "limited") return { name, isYou, status: result, signals: null };
  if (!result) return { name, isYou, status: "missing", signals: null };
  return { name, isYou, status: "linked", signals: result };
}

export type WebsiteShown = { kind: "google"; url: string } | { kind: "saved"; domain: string } | { kind: "none_on_google" } | { kind: "unknown" };

/**
 * What the Website column shows: Google's website, else one the user typed ("added by you"), else "No website on
 * Google" when Google answered without one. When the lookup failed or found no listing, it is unknown, never "no
 * website" (2026-10-14).
 */
export function websiteShown(row: Pick<SignalRow, "status" | "signals" | "savedSite">): WebsiteShown {
  const google = row.signals?.website;
  if (google && /^https?:\/\//i.test(google)) return { kind: "google", url: google };
  if (row.savedSite) return { kind: "saved", domain: row.savedSite };
  return row.status === "linked" ? { kind: "none_on_google" } : { kind: "unknown" };
}

/**
 * The website button a row offers: "add" only when Google answered with no website, "change" for one the user
 * added. Null when Google's website shows, or when the lookup failed or found no listing (2026-10-15): asking for a
 * website there reads as if the business has none.
 */
export function websiteAction(shown: WebsiteShown): "add" | "change" | null {
  return shown.kind === "none_on_google" ? "add" : shown.kind === "saved" ? "change" : null;
}

/**
 * A website the user typed for a competitor, as a bare domain: "https://www.Burning-Brownie.com/menu" gives
 * "burning-brownie.com". Null when it is not a public web address.
 */
export function websiteDomain(raw: string): string | null {
  const text = raw.trim();
  if (!text) return null;
  try {
    const url = new URL(/^[a-z]+:\/\//i.test(text) ? text : `https://${text}`);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    return /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/.test(host) ? host : null;
  } catch {
    return null;
  }
}

/** True when Google had no listing for any row, so a table would be all blanks (DB-016). A load error is not this. */
export function matchedNone(rows: SignalRow[]): boolean {
  return rows.every((r) => r.status === "missing");
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
