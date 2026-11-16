// Turns an approved library file into question_library rows (B-32 step 4). Draft and example files
// are refused, so nothing unreviewed reaches the table.
import type { TablesInsert } from "@/types/database.types";
import { validateLibrary } from "./validate";

export type QuestionLibraryRow = Pick<
  TablesInsert<"question_library">,
  "industry" | "template" | "tags" | "intent" | "version" | "active"
>;

export class LibraryNotLoadableError extends Error {
  constructor(readonly reasons: string[]) {
    super(`Question library cannot be loaded:\n- ${reasons.join("\n- ")}`);
    this.name = "LibraryNotLoadableError";
  }
}

/**
 * The version a draft library is loaded as, to try it before the B-32 review (the table needs version 1 or more). The
 * reviewed file is approved as version 2 or later, and onboarding reads the newest version, so it replaces the draft.
 */
export const DRAFT_LIBRARY_VERSION = 1;

export function toSeedRows(raw: unknown, options: { draft?: boolean } = {}): QuestionLibraryRow[] {
  const result = validateLibrary(raw);
  if (!result.ok) throw new LibraryNotLoadableError(result.errors);
  const { file } = result;
  // A draft loads only when asked for, as DRAFT_LIBRARY_VERSION, so onboarding can use it before the B-32 review.
  if (options.draft) {
    return file.templates.map((t) => ({
      industry: t.industry,
      template: t.template.trim(),
      tags: t.tags.map((tag) => tag.trim().toLowerCase()),
      intent: t.intent,
      version: DRAFT_LIBRARY_VERSION,
      active: true,
    }));
  }
  if (file.status !== "approved" || !file.review) {
    throw new LibraryNotLoadableError([`status is "${file.status}"; only a file approved by a reviewer is loaded`]);
  }
  if (file.version <= DRAFT_LIBRARY_VERSION) {
    throw new LibraryNotLoadableError([`approve the reviewed file as version ${DRAFT_LIBRARY_VERSION + 1} or later; version ${DRAFT_LIBRARY_VERSION} is the draft trial`]);
  }
  return file.templates.map((t) => ({
    industry: t.industry,
    template: t.template.trim(),
    tags: t.tags.map((tag) => tag.trim().toLowerCase()),
    intent: t.intent,
    version: file.version,
    active: true,
  }));
}
