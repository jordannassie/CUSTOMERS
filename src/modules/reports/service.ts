import { randomBytes } from "node:crypto";
import type { CompetitorsView } from "@/modules/competitors";
import type { OverviewView } from "@/modules/overview";

// Share links and the read-only report (B-59, MVP_SPEC 8.3, D-12). Pure apart from the token source.

/** 32 random bytes as base64url: 43 characters, never guessable (MVP_SPEC 8.3). */
export function newShareToken(): string {
  return randomBytes(32).toString("base64url");
}

// Anything else cannot be one of our tokens, so it never reaches the database.
export const SHARE_TOKEN = /^[A-Za-z0-9_-]{43}$/;

export const isShareToken = (token: string): boolean => SHARE_TOKEN.test(token);

export const sharePath = (token: string): string => `/r/${token}`;

export type ReportView = {
  agency: { name: string; hasLogo: boolean };
  businessName: string;
  /** "Aug 31 to Sep 29, 2026": the 30 days the score covers. */
  period: string;
  preparedOn: string;
  score: Omit<NonNullable<OverviewView["score"]>, "details"> | null;
  models: OverviewView["models"];
  trend: OverviewView["trend"];
  competitors: Pick<CompetitorsView, "leaderboard" | "margin" | "signals" | "count" | "hasScore">;
  opportunities: { title: string; impact: OverviewView["opportunities"][number]["impact"] }[];
  /** 2 or 3 plain sentences from the numbers above, no AI (DB-012). */
  summary: string[];
};

const DAY_MS = 86_400_000;

function day(date: Date, withYear: boolean): string {
  return date.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    ...(withYear && { year: "numeric" }),
    timeZone: "UTC",
  });
}

export function reportPeriod(now: Date, windowDays: number): string {
  const from = new Date(now.getTime() - (windowDays - 1) * DAY_MS);
  const sameYear = from.getUTCFullYear() === now.getUTCFullYear();
  return `${day(from, !sameYear)} to ${day(now, true)}`;
}

/**
 * Only what the report shows: no database ids, place ids, method panel or plan limits, since every
 * field here ends up in a public page's HTML.
 */
export function reportView(input: {
  agency: { name: string; hasLogo: boolean };
  businessName: string;
  now: Date;
  windowDays: number;
  overview: OverviewView;
  competitors: CompetitorsView;
}): ReportView {
  const { overview, competitors, now } = input;
  const score = overview.score && {
    value: overview.score.value,
    tone: overview.score.tone,
    label: overview.score.label,
    sentence: overview.score.sentence,
    firstResults: overview.score.firstResults,
    change: overview.score.change,
  };
  return {
    agency: input.agency,
    businessName: input.businessName,
    period: reportPeriod(now, input.windowDays),
    preparedOn: day(now, true),
    score,
    models: overview.models,
    trend: overview.trend,
    competitors: {
      leaderboard: competitors.leaderboard,
      margin: competitors.margin,
      signals: competitors.signals,
      count: competitors.count,
      hasScore: competitors.hasScore,
    },
    opportunities: overview.opportunities.map(({ title, impact }) => ({ title, impact })),
    summary: reportSummary({
      businessName: input.businessName,
      score: overview.score?.value ?? null,
      monthChange: overview.monthChange,
      leaderboard: competitors.leaderboard,
      firstFix: overview.opportunities[0]?.title ?? null,
    }),
  };
}

const inTen = (score: number) => {
  const n = Math.round(score / 10);
  return n === 0 ? "fewer than 1 of 10" : `about ${n} of 10`;
};

/** The top of the client report: the score and its change, the competitor AI picked most, the first fix. */
export function reportSummary(input: {
  businessName: string;
  score: number | null;
  monthChange: OverviewView["monthChange"];
  leaderboard: CompetitorsView["leaderboard"];
  firstFix: string | null;
}): string[] {
  const { businessName: name, score, monthChange } = input;
  if (score === null) return [];
  const change = monthChange
    ? `, ${monthChange.direction} ${monthChange.points} ${monthChange.points === 1 ? "point" : "points"} on the 30 days before`
    : "";
  const lines = [
    score === 0
      ? `Over the last 30 days, AI did not recommend ${name} in any customer questions${change}.`
      : `Over the last 30 days, AI recommended ${name} in ${inTen(score)} customer questions${change}.`,
  ];

  // Only competitors compared over the whole window have a standing (F-53).
  const top = input.leaderboard
    .filter((r) => !r.isYou && r.score !== null && r.standing !== null)
    .sort((a, b) => b.score! - a.score!)[0];
  if (top?.standing === "behind") lines.push(`AI recommended ${top.name} more often, in ${inTen(top.score!)} questions.`);
  else if (top?.standing === "about_same") lines.push(`${top.name}, the competitor AI recommended most, was about level with ${name}.`);
  else if (top?.standing === "ahead") lines.push(`AI recommended ${name} more often than every competitor tracked here.`);

  if (input.firstFix) lines.push(`First fix: ${input.firstFix.replace(/[.!?]$/, "")}.`);
  return lines;
}

const IMAGE_TYPES: { type: string; matches: (b: Uint8Array) => boolean }[] = [
  { type: "image/png", matches: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
  { type: "image/jpeg", matches: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  {
    type: "image/webp",
    matches: (b) =>
      String.fromCharCode(...b.slice(0, 4)) === "RIFF" && String.fromCharCode(...b.slice(8, 12)) === "WEBP",
  },
];

/** The logo's type from its first bytes; null for anything that is not a PNG, JPG or WebP. */
export function logoType(bytes: Uint8Array): string | null {
  return IMAGE_TYPES.find((t) => t.matches(bytes))?.type ?? null;
}

/** The storage path of a logo uploaded to our own bucket; null for any other URL. */
export function storagePath(logoUrl: string, supabaseUrl: string, bucket: string): string | null {
  let url: URL;
  try {
    url = new URL(logoUrl);
  } catch {
    return null;
  }
  const prefix = `/storage/v1/object/public/${bucket}/`;
  if (url.origin !== new URL(supabaseUrl).origin || !url.pathname.startsWith(prefix)) return null;
  const path = decodeURIComponent(url.pathname.slice(prefix.length));
  return path && !path.split("/").includes("..") ? path : null;
}

/** "sunrise-coffee-bar-ai-visibility-2026-09-29.pdf" (B-60). */
export function pdfFileName(businessName: string, now: Date): string {
  const slug = businessName
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/, "");
  return `${slug || "report"}-ai-visibility-${now.toISOString().slice(0, 10)}.pdf`;
}
