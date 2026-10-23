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

export function toSeedRows(raw: unknown): QuestionLibraryRow[] {
  const result = validateLibrary(raw);
  if (!result.ok) throw new LibraryNotLoadableError(result.errors);
  const { file } = result;
  if (file.status !== "approved" || !file.review) {
    throw new LibraryNotLoadableError([`status is "${file.status}"; only a file approved by a reviewer is loaded`]);
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
