// The question library file (MVP_SPEC 5.3): drafted by scripts/generate-question-library.ts, read and
// approved by a person, then loaded into question_library by scripts/seed-question-library.ts.
import { z } from "zod";
import { INDUSTRIES } from "@/lib/industries";

// Same values as the question_library.intent check in 021_core_tables.sql.
export const INTENTS = ["best", "urgent", "price", "reviews", "comparison"] as const;
export type Intent = (typeof INTENTS)[number];

export const CITY = "{city}";

export const templateSchema = z.object({
  industry: z.enum(INDUSTRIES),
  template: z.string(),
  tags: z.array(z.string()),
  intent: z.enum(INTENTS),
});
export type LibraryTemplate = z.infer<typeof templateSchema>;

// draft: written by the model, not yet reviewed. approved: a person read every template. example: the
// tiny test file, never loaded.
export const LIBRARY_STATUSES = ["draft", "approved", "example"] as const;

export const libraryFileSchema = z.object({
  version: z.number().int().min(1),
  status: z.enum(LIBRARY_STATUSES),
  note: z.string().optional(),
  promptVersion: z.string(),
  model: z.string(),
  generatedAt: z.string(),
  review: z
    .object({
      reviewer: z.string().trim().min(1),
      reviewedAt: z.iso.date(),
    })
    .nullable(),
  templates: z.array(templateSchema),
});
export type LibraryFile = z.infer<typeof libraryFileSchema>;
