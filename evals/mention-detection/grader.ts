// Code grader for mention detection (MVP_SPEC 25, D-66). Labels come from people, never from a model.
import { existsSync, readFileSync } from "node:fs";
import { z } from "zod";
import { accuracy, type Labelled } from "../shared/metrics";

export const DATASET_PATH = new URL("./dataset.v1.jsonl", import.meta.url);

const caseSchema = z.object({
  id: z.string().min(1),
  model: z.enum(["gpt-4.1-mini", "claude-haiku-4-5", "sonar"]),
  question: z.string().min(1),
  answer: z.string().min(1),
  business: z.object({
    name: z.string().min(1),
    aliases: z.array(z.string()).optional(),
    website: z.string().nullable().optional(),
    city: z.string().nullable().optional(),
    phone: z.string().nullable().optional(),
    hasWebsite: z.boolean().optional(),
  }),
  // The person's label: is this business mentioned in the answer, and at which list item.
  mentioned: z.boolean(),
  position: z.number().int().positive().nullable().optional(),
  labelledBy: z.string().min(1),
  note: z.string().optional(),
});

export type MentionCase = z.infer<typeof caseSchema>;

export function loadDataset(path: URL = DATASET_PATH): MentionCase[] | null {
  if (!existsSync(path)) return null;
  return readFileSync(path, "utf8")
    .split("\n")
    .filter((line) => line.trim())
    .map((line, i) => {
      const parsed = caseSchema.safeParse(JSON.parse(line));
      if (!parsed.success) throw new Error(`dataset line ${i + 1}: ${parsed.error.message}`);
      return parsed.data;
    });
}

export type GradedCase = MentionCase & { predicted: boolean; predictedPosition: number | null };

/** Accuracy, false positive rate and recall, reported separately (B-24). */
export function score(graded: GradedCase[]) {
  const labelled: Labelled[] = graded.map((c) => ({ expected: c.mentioned, predicted: c.predicted }));
  const base = accuracy(labelled);
  const positives = graded.filter((c) => c.mentioned).length;
  const negatives = graded.length - positives;
  const truePositives = graded.filter((c) => c.mentioned && c.predicted).length;
  const withPosition = graded.filter((c) => c.mentioned && c.predicted && c.position !== undefined);
  return {
    ...base,
    positives,
    negatives,
    falsePositiveRate: negatives ? base.falsePositives / negatives : 0,
    recall: positives ? truePositives / positives : 0,
    positionAgreement: withPosition.length
      ? withPosition.filter((c) => c.predictedPosition === (c.position ?? null)).length / withPosition.length
      : null,
  };
}
