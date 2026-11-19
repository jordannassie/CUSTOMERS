// Labelling sheets for the two suites that grade saved AI answers: mention detection (B-24) and "also recommended"
// name extraction (B-25). The export fills in the answer and the business; the person fills in only the label
// columns. The import turns the filled sheet into dataset rows in each suite's README format. The label always comes
// from the person, never from our detector or extractor (MVP_SPEC 25, principle 6). Pure.
import { splitList, yesNo, type CsvRow } from "./csv";

/** One saved answer with the business it was asked for and that business's tracked competitors. */
export type SourceAnswer = {
  id: string;
  provider: string;
  question: string;
  answer: string;
  business: { name: string; website: string | null; city: string | null; phone: string | null; aliases: string[] };
  competitors: { name: string; website: string | null; city: string | null; aliases: string[] }[];
};

const MODEL_BY_PROVIDER: Record<string, string> = { openai: "gpt-4.1-mini", anthropic: "claude-haiku-4-5", perplexity: "sonar" };
export const evalModel = (provider: string) => MODEL_BY_PROVIDER[provider] ?? null;

export const MENTION_COLUMNS = [
  "id",
  "model",
  "question",
  "business_name",
  "business_website",
  "business_city",
  "business_phone",
  "business_aliases",
  "answer",
  "mentioned",
  "position",
  "note",
] as const;

/**
 * Two cases per answer when it can: one for the business the question was asked for and one for a tracked competitor,
 * so the sheet holds both answers that name the business and ones that do not. The person decides which is which.
 */
export function mentionRows(answers: readonly SourceAnswer[]): CsvRow[] {
  const rows: CsvRow[] = [];
  answers.forEach((a, i) => {
    const model = evalModel(a.provider);
    if (!model) return;
    const subjects = [a.business, a.competitors[i % Math.max(1, a.competitors.length)]].filter(Boolean);
    subjects.forEach((s, j) => {
      rows.push({
        id: `md-${a.id.slice(0, 8)}-${j === 0 ? "b" : "c"}`,
        model,
        question: a.question,
        business_name: s.name,
        business_website: s.website ?? "",
        business_city: s.city ?? "",
        business_phone: "phone" in s && typeof s.phone === "string" ? s.phone : "",
        business_aliases: s.aliases.join(" | "),
        answer: a.answer,
      });
    });
  });
  return rows;
}

export type Imported = { cases: Record<string, unknown>[]; problems: string[]; unlabelled: number };

export function mentionCases(rows: readonly CsvRow[], labelledBy: string): Imported {
  const cases: Record<string, unknown>[] = [];
  const problems: string[] = [];
  let unlabelled = 0;
  rows.forEach((r, i) => {
    const at = `row ${i + 2} (${r.id})`;
    const mentioned = yesNo(r.mentioned);
    if (mentioned === null) {
      if (r.mentioned) problems.push(`${at}: mentioned must be yes or no, not "${r.mentioned}"`);
      else unlabelled++;
      return;
    }
    const position = r.position ? Number(r.position) : null;
    if (r.position && (!Number.isInteger(position) || position! < 1)) problems.push(`${at}: position must be a whole number from 1`);
    if (!mentioned && position) problems.push(`${at}: position given but mentioned is no`);
    cases.push({
      id: r.id,
      model: r.model,
      question: r.question,
      answer: r.answer,
      business: {
        name: r.business_name,
        website: r.business_website || null,
        city: r.business_city || null,
        phone: r.business_phone || null,
        aliases: splitList(r.business_aliases),
      },
      mentioned,
      position: mentioned ? position : null,
      labelledBy,
      ...(r.note ? { note: r.note } : {}),
    });
  });
  return { cases, problems, unlabelled };
}

export const EXTRACTION_COLUMNS = ["id", "model", "question", "city", "answer", "names", "note"] as const;

export function extractionRows(answers: readonly SourceAnswer[]): CsvRow[] {
  return answers.flatMap((a) => {
    const model = evalModel(a.provider);
    if (!model || !a.business.city) return [];
    return [{ id: `ee-${a.id.slice(0, 8)}`, model, question: a.question, city: a.business.city, answer: a.answer }];
  });
}

/** "names": every business the answer names, separated by "|"; "none" for an answer that names no business. */
export function extractionCases(rows: readonly CsvRow[], labelledBy: string): Imported {
  const cases: Record<string, unknown>[] = [];
  const problems: string[] = [];
  let unlabelled = 0;
  rows.forEach((r, i) => {
    const value = (r.names ?? "").trim();
    if (!value) {
      unlabelled++;
      return;
    }
    const names = value.toLowerCase() === "none" ? [] : splitList(value);
    if (value.toLowerCase() !== "none" && !names.length) problems.push(`row ${i + 2} (${r.id}): names is empty; write "none" when it names none`);
    cases.push({
      id: r.id,
      model: r.model,
      question: r.question,
      city: r.city,
      answer: r.answer,
      names,
      labelledBy,
      ...(r.note ? { note: r.note } : {}),
    });
  });
  return { cases, problems, unlabelled };
}
