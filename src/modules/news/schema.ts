import { z } from "zod";

// What the admin LinkedIn studio sends to its two routes (news/search, news/article), checked with zod (admin audit
// 2026-11-12: plain typeof checks and no length limits). A bad period or weekday falls back to the default, as before.

export const WEEKDAYS = ["monday", "tuesday", "wednesday", "thursday", "friday"] as const;
export type Weekday = (typeof WEEKDAYS)[number];

export const NEWS_PERIODS = ["24h", "48h", "7d"] as const;
export type NewsPeriod = (typeof NEWS_PERIODS)[number];

const weekday = z.enum(WEEKDAYS).catch("monday");

/** Text from the form: anything that is not a string is empty, as before; too long is an error, not cut silently. */
const text = (max: number) =>
  z
    .unknown()
    .optional()
    .transform((v) => (typeof v === "string" ? v.trim() : ""))
    .pipe(z.string().max(max, `Keep each field under ${max.toLocaleString("en-US")} characters.`));

export const newsSearchInput = z.object({
  period: z.enum(NEWS_PERIODS).catch("24h"),
  weekday,
});

export const newsArticleInput = z.object({
  headline: text(300).pipe(z.string().min(1, "Headline is required.")),
  whatIsNew: text(2_000),
  whatItHelpsDo: text(2_000),
  businessOpportunity: text(2_000),
  howToTryIt: text(2_000),
  sourceUrl: text(2_000),
  sourceName: text(200),
  // A missing category is "AI Search", as before; an empty one stays empty.
  category: z
    .unknown()
    .optional()
    .transform((v) => (typeof v === "string" ? v.trim() : "AI Search"))
    .pipe(z.string().max(100, "Keep each field under 100 characters.")),
  bestFor: text(2_000),
  weekday,
});
export type NewsArticleInput = z.infer<typeof newsArticleInput>;

/** The first problem in words, for the route's 400. */
export const firstIssue = (error: z.ZodError) => error.issues[0]?.message ?? "Invalid request body.";
