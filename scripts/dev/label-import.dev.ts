// Turns a filled labelling sheet into the suite's dataset.v1.jsonl (B-24, B-25, B-33, B-34, B-51), with the labeller's
// name and today's date, and checks it with the suite's own dataset reader. Rows already in the dataset (same id) are
// kept as they are; unlabelled rows are skipped, so a sheet can be done in several sittings.
//   LABEL_SUITE=mention-detection LABELLER="Your name" npm run label:import
//   LABEL_CSV=path/to/sheet.csv   (default evals/results/labelling/<suite>.csv)
//   LABEL_CASES_FILE=cases.jsonl  (B-51 only: the same file the export read)
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { expect, it } from "vitest";
import { loadDataset as loadMentions } from "../../evals/mention-detection/grader";
import { parseDataset as parseExtraction } from "../../evals/entity-extraction/grader";
import { parseDataset as parsePicking } from "../../evals/question-picking/grader";
import { parseDataset as parseAutofill } from "../../evals/business-autofill/grader";
import { parseDataset as parseExplain } from "../../evals/why-competitors-win/grader";
import { parseCsv } from "../lib/csv";
import { extractionCases, mentionCases, type Imported } from "../lib/labelling-answers";
import { autofillCases, explainCases, pickingCases, type ExplainSourceCase } from "../lib/labelling-cases";

const SUITE = process.env.LABEL_SUITE ?? "";
const LABELLER = (process.env.LABELLER ?? "").trim();
const TODAY = new Date().toISOString().slice(0, 10);

it(`import the labelling sheet for ${SUITE || "(set LABEL_SUITE)"}`, () => {
  if (!LABELLER) throw new Error('Set LABELLER to the name of the person who labelled the sheet, e.g. LABELLER="Jordan"');
  const sheet = process.env.LABEL_CSV || `evals/results/labelling/${SUITE}.csv`;
  const rows = parseCsv(readFileSync(sheet, "utf8"));
  let result: Imported;
  if (SUITE === "mention-detection") result = mentionCases(rows, LABELLER);
  else if (SUITE === "entity-extraction") result = extractionCases(rows, LABELLER);
  else if (SUITE === "question-picking") {
    const library = JSON.parse(readFileSync("supabase/seed/question-library.v1.json", "utf8"));
    result = pickingCases(rows, LABELLER, TODAY, library.version);
  } else if (SUITE === "business-autofill") result = autofillCases(rows, LABELLER, TODAY);
  else if (SUITE === "why-competitors-win") {
    const file = process.env.LABEL_CASES_FILE;
    if (!file) throw new Error("Set LABEL_CASES_FILE to the cases file the export read");
    const source = readFileSync(file, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l) as ExplainSourceCase);
    result = explainCases(rows, source, LABELLER, TODAY);
  } else throw new Error("Set LABEL_SUITE to one of the five suites");

  if (result.problems.length) {
    console.error(`Not written. Fix these in ${sheet}:\n- ${result.problems.join("\n- ")}`);
    expect(result.problems).toEqual([]);
    return;
  }
  const path = `evals/${SUITE}/dataset.v1.jsonl`;
  const existing = existsSync(path) ? readFileSync(path, "utf8").split("\n").filter(Boolean) : [];
  const known = new Set(existing.map((l) => (JSON.parse(l) as { id: string }).id));
  const added = result.cases.filter((c) => !known.has(c.id as string)).map((c) => JSON.stringify(c));
  if (!added.length) {
    // No file is created from an empty sheet: a dataset file turns the suite on (it is skipped while it is missing).
    console.log(`Nothing new to write: ${result.unlabelled} unlabelled rows, ${result.cases.length - added.length} already in ${path}.`);
    return;
  }
  const text = [...existing, ...added].join("\n") + "\n";

  // The suite's own reader: a row it would refuse in the eval is refused here, before it is written.
  if (SUITE === "mention-detection") {
    const dir = mkdtempSync(join(tmpdir(), "label-check-"));
    try {
      writeFileSync(join(dir, "dataset.v1.jsonl"), text);
      loadMentions(pathToFileURL(join(dir, "dataset.v1.jsonl")));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  } else if (SUITE === "entity-extraction") parseExtraction(text, { allowExamples: false });
  else if (SUITE === "question-picking") parsePicking(text, { allowExamples: false });
  else if (SUITE === "business-autofill") parseAutofill(text, { allowExamples: false });
  else parseExplain(text, { allowExamples: false });

  writeFileSync(path, text);
  console.log(`${path}: ${existing.length} rows before, ${added.length} added, ${result.unlabelled} unlabelled rows skipped.`);
  console.log(`Next: record who labelled and when in evals/${SUITE}/README.md, then run the fast suite: npx vitest run --project evals evals/${SUITE}`);
});
