// The client report as data (dashboard redesign, 7. Reports): one shape for the live report, a saved snapshot, the share
// link and the PDF. Snapshots store it as JSON, so the schema also checks a stored one before it is shown. Every field
// ends up in a public page: no database ids, no place ids, no Google values (D-73), no emails. Pure.
import { z } from "zod";

const STANDINGS = ["ahead", "behind", "about_same"] as const;
const IMPACTS = ["high", "medium", "low"] as const;

const pointsChange = z.object({ direction: z.enum(["up", "down"]), points: z.number() }).nullable();

const modelRow = z.object({
  id: z.enum(["openai", "anthropic", "perplexity"]),
  label: z.string(),
  score: z.number().nullable(),
  notChecked: z.boolean().optional(),
  skipped: z.boolean().optional(),
  change: pointsChange,
});

const competitorRow = z.object({
  name: z.string(),
  isYou: z.boolean(),
  score: z.number().nullable(),
  /** Percent of the times AI named any of these businesses. */
  share: z.number().nullable(),
  /** From the score report, which uses the shared compareStatus rule (scanning/scoring.ts). */
  standing: z.enum(STANDINGS).nullable(),
  collecting: z.boolean(),
  /** The top likely reason from saved answers (standing/competitorWhy), never Google values. */
  reason: z.string().nullable(),
});

const questionRow = z.object({
  question: z.string(),
  named: z.number(),
  answers: z.number(),
  /** At the latest weekly scan against the one before; null with one scan. */
  trend: z.enum(["up", "down", "same"]).nullable(),
});

const sourceRow = z.object({ host: z.string(), answers: z.number(), namedYou: z.number(), own: z.boolean() });

const actionRow = z.object({ title: z.string(), impact: z.enum(IMPACTS), where: z.string(), why: z.string().nullable() });

export const reportDocumentSchema = z.object({
  version: z.literal(1),
  businessName: z.string(),
  /** The website the owner typed, shown under the name. */
  domain: z.string().nullable(),
  place: z.string().nullable(),
  preparedAt: z.string(),
  windowDays: z.number(),
  /** Suggested questions only: the user's own are not part of the score or this report. */
  questionCount: z.number(),
  lastScanAt: z.string().nullable(),
  paused: z.boolean(),
  summary: z.object({
    headline: z.string(),
    score: z.object({ value: z.number(), label: z.string(), tone: z.enum(["good", "mid", "low"]) }).nullable(),
    rank: z
      .object({ position: z.number(), total: z.number(), leader: z.object({ name: z.string(), score: z.number() }).nullable() })
      .nullable(),
    citations: z.object({ cited: z.number(), answers: z.number(), hasSite: z.boolean() }),
    lines: z.array(z.string()),
  }),
  models: z.object({ headline: z.string(), rows: z.array(modelRow) }),
  competitors: z.object({ headline: z.string(), rows: z.array(competitorRow), hasReasons: z.boolean() }),
  questions: z.object({ headline: z.string(), rows: z.array(questionRow) }),
  sources: z.object({ headline: z.string(), answers: z.number(), rows: z.array(sourceRow) }),
  actions: z.object({ rows: z.array(actionRow) }),
});

export type ReportDocument = z.infer<typeof reportDocumentSchema>;
export type ModelLine = z.infer<typeof modelRow>;
export type CompetitorLine = z.infer<typeof competitorRow>;
export type QuestionLine = z.infer<typeof questionRow>;
export type SourceLine = z.infer<typeof sourceRow>;
export type ActionLine = z.infer<typeof actionRow>;

/** A stored snapshot, or null when it is not one this version can show. */
export function parseDocument(json: unknown): ReportDocument | null {
  const parsed = reportDocumentSchema.safeParse(json);
  return parsed.success ? parsed.data : null;
}
