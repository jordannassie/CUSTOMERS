// The frozen data of one AI visibility report (version 2, the 10-page PDF in docs/report-reference.pdf). Built once
// (v2/build.ts) and saved in the reports table; the PDF, the share link and the email all read this one object, so
// their numbers never differ. Every number here is computed in code from saved answers; wording that AI writes
// (fix titles, why, steps) is checked against these numbers before it is kept. Pure.
import { z } from "zod";

export const PRIORITIES = ["critical", "high", "medium", "low"] as const;
export const LEVELS = ["high", "medium", "low"] as const;
/** Where a fix is made. Each has a label in the PDF ("Your website", "Google Business Profile", ...). */
export const AREAS = ["website", "google", "delivery", "reviews", "blogs", "social", "directories", "other"] as const;

const change = z.object({ direction: z.enum(["up", "down"]), points: z.number() });
const excerpt = z.object({
  engine: z.string(),
  /** ISO date of the answer. */
  date: z.string(),
  question: z.string(),
  /** A short excerpt of the answer around the name it shows, as the AI wrote it. */
  text: z.string(),
  /** The business the excerpt is about (you, or the competitor named instead). */
  name: z.string(),
});
const card = z.object({ title: z.string(), detail: z.string() });

export const fixSchema = z.object({
  /** 1-based, in priority order: "Fix 1", "#1". */
  n: z.number().int().positive(),
  /** The issue's stable key ("own_site_uncited", "source:google.com", "theme:quality"); also its Actions dedupe key. */
  key: z.string(),
  title: z.string(),
  areas: z.array(z.enum(AREAS)).min(1),
  /** "Your website", "Website, food blogs, TripAdvisor": the where line, as shown. */
  where: z.string(),
  priority: z.enum(PRIORITIES),
  impact: z.enum(LEVELS),
  effort: z.enum(LEVELS),
  owner: z.string(),
  /** "What AI showed us": the evidence, with its numbers. */
  evidence: z.string(),
  why: z.string(),
  steps: z.array(z.string()).min(2).max(4),
  /** "Done when" for a yes/no goal, "Target for next scan" for a number to reach. */
  goal: z.object({ label: z.enum(["Done when", "Target for next scan"]), text: z.string() }),
  /** Whether the wording came from the AI writer (checked) or the templates. */
  wording: z.enum(["ai", "template"]),
});

export const reportSnapshotSchema = z.object({
  version: z.literal(2),
  preparedAt: z.string(),
  period: z.object({ start: z.string(), end: z.string(), days: z.number() }),
  agency: z.object({
    name: z.string(),
    /** Storage path of the agency logo, read when the PDF is drawn; null for none. */
    logoPath: z.string().nullable(),
    /** Accent colour for section labels, "Where" labels and step numbers (agency branding, default #1F4FD1). */
    accent: z.string(),
    contactEmail: z.string().nullable(),
    bookingUrl: z.string().nullable(),
  }),
  business: z.object({ name: z.string(), domain: z.string().nullable(), market: z.string().nullable() }),
  coverage: z.object({ questions: z.number(), engines: z.array(z.string()), answers: z.number() }),
  /** Visibility score = answers naming you / all answers x 100 (D-91), with its change on the 30 days before. */
  score: z.object({ value: z.number(), change: change.nullable(), rangePoints: z.number().nullable() }),
  /** "9 of 60 answers", "in 6 of 10 questions". */
  named: z.object({ answers: z.number(), total: z.number(), questions: z.number(), questionsAsked: z.number() }),
  rank: z.object({ position: z.number(), of: z.number(), leader: z.object({ name: z.string(), score: z.number() }).nullable() }).nullable(),
  ownSite: z.object({ hasSite: z.boolean(), cited: z.number(), otherSites: z.number() }),
  /** Answers naming you / answers naming any tracked business; null when none named one. */
  shareOfPicks: z.number().nullable(),
  /** You and each tracked competitor, by answers naming them. `mentions` 0 shows "Not named in any answer". */
  businesses: z.array(z.object({ name: z.string(), isYou: z.boolean(), mentions: z.number(), score: z.number().nullable() })),
  summary: z.object({
    headline: z.string(),
    lead: z.string(),
    short: z.object({ knows: z.string(), behind: z.string(), fixes: z.string() }),
  }),
  knows: z.object({
    headline: z.string(),
    knownFor: card.nullable(),
    trustedBy: card.nullable(),
    foundThrough: card.nullable(),
    /** Up to 4 things AI does not know, each with its evidence and the fix number that fills it. */
    gaps: z.array(z.object({ title: z.string(), evidence: z.string(), fix: z.number().nullable() })).max(4),
    excerpts: z.object({ named: excerpt.nullable(), competitor: excerpt.nullable() }),
  }),
  behind: z.object({
    headline: z.string(),
    line: z.string(),
    reasons: z.array(z.object({ title: z.string(), them: z.string(), you: z.string(), fixes: z.array(z.number()) })).max(4),
    wins: z.string().nullable(),
  }),
  fixes: z.array(fixSchema).max(6),
  /** "Where to make the changes": each area with its fix numbers and what changes there. */
  areas: z.array(z.object({ area: z.enum(AREAS), label: z.string(), fixes: z.array(z.number()), text: z.string() })),
  roadmap: z.object({
    columns: z
      .array(
        z.object({
          days: z.string(),
          title: z.string(),
          tasks: z.array(z.object({ label: z.string(), area: z.string() })),
          goal: z.string(),
        }),
      )
      .length(3),
    nextScanAt: z.string().nullable(),
  }),
  method: z.object({ text: z.string() }),
});

export type ReportSnapshot = z.infer<typeof reportSnapshotSchema>;
export type ReportFix = z.infer<typeof fixSchema>;
export type ReportArea = (typeof AREAS)[number];
export type Priority = (typeof PRIORITIES)[number];

export const AREA_LABELS: Record<ReportArea, string> = {
  website: "Your website",
  google: "Google Business Profile",
  delivery: "Delivery apps",
  reviews: "Review sites",
  blogs: "Blogs and guides",
  social: "Social",
  directories: "Directories",
  other: "Other sites",
};

/** A stored snapshot, or null when it is not a version 2 report. */
export function parseSnapshot(json: unknown): ReportSnapshot | null {
  const parsed = reportSnapshotSchema.safeParse(json);
  return parsed.success ? parsed.data : null;
}
