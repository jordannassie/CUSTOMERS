import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";
import { loadDataset as loadMentions } from "../../evals/mention-detection/grader";
import { parseDataset as parseExtraction } from "../../evals/entity-extraction/grader";
import { parseDataset as parsePicking } from "../../evals/question-picking/grader";
import { parseDataset as parseAutofill } from "../../evals/business-autofill/grader";
import { parseDataset as parseExplain } from "../../evals/why-competitors-win/grader";
import { parseCsv, toCsv } from "./csv";
import { EXTRACTION_COLUMNS, MENTION_COLUMNS, extractionCases, extractionRows, mentionCases, mentionRows, type SourceAnswer } from "./labelling-answers";
import { AUTOFILL_COLUMNS, EXPLAIN_COLUMNS, PICKING_COLUMNS, autofillCases, autofillRows, explainCases, explainRows, pickingCases, pickingRows } from "./labelling-cases";

const jsonl = (cases: unknown[]) => cases.map((c) => JSON.stringify(c)).join("\n") + "\n";
// Each sheet goes through CSV text and back, the way a person's spreadsheet would.
const roundTrip = (columns: readonly string[], rows: Record<string, string>[]) => parseCsv(toCsv(columns, rows));

const answer: SourceAnswer = {
  id: "0f9a1b2c-0000-0000-0000-000000000000",
  provider: "perplexity",
  question: "Who is the best plumber in Austin, TX?",
  answer: "1. **Ace Plumbing**, fast and friendly.\n2. **Rapid Rooter & Drain**.",
  business: { name: "Ace Plumbing", website: "aceplumbing.com", city: "Austin", phone: "(512) 555-0100", aliases: ["Ace"] },
  competitors: [{ name: "Rapid Rooter & Drain", website: null, city: "Austin", aliases: [] }],
};

describe("mention detection sheet (B-24)", () => {
  it("offers the business and a competitor per answer, and imports only labelled rows in the suite's format", () => {
    const rows = roundTrip(MENTION_COLUMNS, mentionRows([answer]));
    expect(rows.map((r) => [r.id, r.model, r.business_name])).toEqual([
      ["md-0f9a1b2c-b", "sonar", "Ace Plumbing"],
      ["md-0f9a1b2c-c", "sonar", "Rapid Rooter & Drain"],
    ]);
    rows[0].mentioned = "yes";
    rows[0].position = "1";
    const out = mentionCases(rows, "A Person");
    expect(out.problems).toEqual([]);
    expect(out.unlabelled).toBe(1);
    const file = join(mkdtempSync(join(tmpdir(), "md-")), "dataset.v1.jsonl");
    writeFileSync(file, jsonl(out.cases));
    expect(loadMentions(pathToFileURL(file))).toHaveLength(1);
  });

  it("refuses a bad label and a position on a no", () => {
    const rows = roundTrip(MENTION_COLUMNS, mentionRows([answer]));
    rows[0].mentioned = "maybe";
    rows[1].mentioned = "no";
    rows[1].position = "2";
    expect(mentionCases(rows, "A Person").problems).toHaveLength(2);
  });
});

describe("name extraction sheet (B-25)", () => {
  it("imports names split on | and 'none' as an empty list", () => {
    const rows = roundTrip(EXTRACTION_COLUMNS, extractionRows([answer, { ...answer, id: "1234567890" }]));
    rows[0].names = "Ace Plumbing | Rapid Rooter & Drain";
    rows[1].names = "none";
    const out = extractionCases(rows, "A Person");
    expect(out.problems).toEqual([]);
    expect(parseExtraction(jsonl(out.cases), { allowExamples: false }).map((c) => c.names)).toEqual([["Ace Plumbing", "Rapid Rooter & Drain"], []]);
  });
});

describe("question picking sheet (B-33)", () => {
  const templates = Array.from({ length: 14 }, (_, i) => ({ industry: "plumber", template: `Which plumber in {city} is best for job ${i}?` }));

  it("lists the industry's templates per business and groups the yes rows into an acceptable pool", () => {
    const business = { id: "qp-001", industry: "plumber", services: ["drain cleaning", "water heaters"], description: "Family plumber.", city: "Austin", region: "TX" };
    const rows = roundTrip(PICKING_COLUMNS, pickingRows([business], [...templates, { industry: "dentist", template: "x {city}?" }]));
    expect(rows).toHaveLength(14);
    rows.slice(0, 12).forEach((r) => (r.acceptable = "yes"));
    const out = pickingCases(rows, "A Person", "2026-11-14", 1);
    expect(out.problems).toEqual([]);
    const [c] = parsePicking(jsonl(out.cases), { allowExamples: false });
    expect(c.acceptable).toHaveLength(12);
    expect(c.input).toEqual({ industry: "plumber", services: ["drain cleaning", "water heaters"], description: "Family plumber.", city: "Austin", region: "TX" });
  });

  it("warns when a pool is smaller than the guide's 12", () => {
    const rows = roundTrip(PICKING_COLUMNS, pickingRows([{ id: "qp-002", industry: "plumber", services: [], description: "", city: "Austin", region: null }], templates));
    rows[0].acceptable = "yes";
    expect(pickingCases(rows, "A Person", "2026-11-14", 1).problems[0]).toMatch(/at least 12/);
  });
});

describe("business auto-fill sheet (B-34)", () => {
  it("imports filled rows with empty fields for what no source states", () => {
    const rows = roundTrip(AUTOFILL_COLUMNS, autofillRows(["aceplumbing.com", "other.com"]));
    Object.assign(rows[0], { blocks_scanners: "no", name: "Ace Plumbing", industry: "plumber", services: "drains | water heaters", city: "Austin", state: "TX", country: "US" });
    const out = autofillCases(rows, "A Person", "2026-11-14");
    expect(out.unlabelled).toBe(1);
    const [c] = parseAutofill(jsonl(out.cases), { allowExamples: false });
    expect(c.expected).toMatchObject({ name: "Ace Plumbing", services: ["drains", "water heaters"], phone: "", address: "" });
  });
});

describe("why competitors win sheet (B-51)", () => {
  const output = {
    reasons: [
      {
        title: "Bean House is named more often",
        evidence: "AI named Bean House in 5 of 6 answers.",
        why_it_matters: "AI repeats the names it sees most.",
        steps: ["Ask 3 regulars for a review this week."],
        impact: "high",
        category: "reviews_reputation",
        fix_on_website: false,
        copy_for_claude: "",
      },
    ],
  };
  const source = [{ id: "wcw-001", input: { business: { name: "Sunrise Coffee", city: "Springfield" }, placeholders: {} }, output }];

  it("shows every reason in full and imports the 4 verdicts as the human calibration", () => {
    const rows = roundTrip(EXPLAIN_COLUMNS, explainRows(source));
    expect(rows[0].reasons).toContain("Why it matters: AI repeats the names it sees most.");
    Object.assign(rows[0], { grounded: "pass", specific: "pass", actionable: "fail", no_invented_numbers: "pass" });
    const out = explainCases(rows, source, "A Person", "2026-11-14");
    expect(out.problems).toEqual([]);
    const [c] = parseExplain(jsonl(out.cases), { allowExamples: false });
    expect(c.calibration.human).toEqual({ grounded: true, specific: true, actionable: false, noInventedNumbers: true });
  });

  it("refuses a case with only some checks graded", () => {
    const rows = roundTrip(EXPLAIN_COLUMNS, explainRows(source));
    rows[0].grounded = "pass";
    expect(explainCases(rows, source, "A Person", "2026-11-14").problems[0]).toMatch(/all 4 checks/);
  });
});
