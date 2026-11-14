// Labelling sheets for the suites whose cases a person builds: question picking (B-33), business auto-fill (B-34) and
// "why competitors win" (B-51). The export lays out what to judge; the person fills the label columns; the import
// writes dataset rows in each suite's README format. Labels come from the person only (MVP_SPEC 25, principle 6). Pure.
import { splitList, yesNo, type CsvRow } from "./csv";
import type { Imported } from "./labelling-answers";

export type PickingBusiness = { id: string; industry: string; services: string[]; description: string; city: string; region: string | null };

export const PICKING_COLUMNS = ["case_id", "industry", "services", "description", "city", "region", "template", "acceptable", "note"] as const;

/** One row per (business, library template of its industry): the person marks "acceptable" yes or leaves it blank. */
export function pickingRows(businesses: readonly PickingBusiness[], templates: readonly { industry: string; template: string }[]): CsvRow[] {
  return businesses.flatMap((b) =>
    templates
      .filter((t) => t.industry === b.industry)
      .map((t) => ({
        case_id: b.id,
        industry: b.industry,
        services: b.services.join(" | "),
        description: b.description,
        city: b.city,
        region: b.region ?? "",
        template: t.template,
      })),
  );
}

export function pickingCases(rows: readonly CsvRow[], labelledBy: string, labelledAt: string, libraryVersion: number): Imported {
  const byCase = new Map<string, CsvRow[]>();
  for (const r of rows) byCase.set(r.case_id, [...(byCase.get(r.case_id) ?? []), r]);
  const cases: Record<string, unknown>[] = [];
  const problems: string[] = [];
  let unlabelled = 0;
  for (const [id, group] of byCase) {
    const acceptable = group.filter((r) => yesNo(r.acceptable) === true).map((r) => r.template);
    if (!acceptable.length) {
      unlabelled++;
      continue;
    }
    if (acceptable.length < 12) problems.push(`${id}: ${acceptable.length} acceptable templates; the guide asks for at least 12 (15 to 25 is best)`);
    const first = group[0];
    const note = group.map((r) => r.note).filter(Boolean).join(" ");
    cases.push({
      id,
      input: {
        industry: first.industry,
        services: splitList(first.services),
        description: first.description,
        city: first.city,
        region: first.region || null,
      },
      acceptable,
      libraryVersion,
      labelledBy,
      labelledAt,
      ...(note ? { note } : {}),
    });
  }
  return { cases, problems, unlabelled };
}

export const AUTOFILL_FIELDS = ["name", "industry", "description", "services", "city", "state", "country", "phone", "address"] as const;
export const AUTOFILL_COLUMNS = ["id", "domain", "blocks_scanners", ...AUTOFILL_FIELDS, "note"] as const;

export function autofillRows(domains: readonly string[]): CsvRow[] {
  return domains.map((domain, i) => ({ id: `ba-${String(i + 1).padStart(3, "0")}`, domain }));
}

/** A row counts as labelled once "blocks_scanners" is yes or no. Empty fields mean "neither source says it". */
export function autofillCases(rows: readonly CsvRow[], labelledBy: string, labelledAt: string): Imported {
  const cases: Record<string, unknown>[] = [];
  const problems: string[] = [];
  let unlabelled = 0;
  rows.forEach((r, i) => {
    const blocks = yesNo(r.blocks_scanners);
    if (blocks === null) {
      if (r.blocks_scanners) problems.push(`row ${i + 2} (${r.id}): blocks_scanners must be yes or no`);
      else unlabelled++;
      return;
    }
    if (!r.domain) problems.push(`row ${i + 2} (${r.id}): domain is empty`);
    const expected = Object.fromEntries(AUTOFILL_FIELDS.map((f) => [f, f === "services" ? splitList(r[f]) : (r[f] ?? "")]));
    cases.push({
      id: r.id,
      input: { domain: r.domain },
      blocksScanners: blocks,
      expected,
      labelledBy,
      labelledAt,
      ...(r.note ? { note: r.note } : {}),
    });
  });
  return { cases, problems, unlabelled };
}

/** One explanation to grade: the facts it was written from and the writer's output (from a developer's writer run). */
export type ExplainSourceCase = { id: string; input: Record<string, unknown>; output: { reasons?: unknown[] } };

export const VERDICTS = ["grounded", "specific", "actionable", "no_invented_numbers"] as const;
export const EXPLAIN_COLUMNS = ["id", "business", "facts", "reasons", ...VERDICTS, "note"] as const;

const text = (v: unknown) => (typeof v === "string" ? v : v == null ? "" : JSON.stringify(v));

/** The sheet shows the facts and every reason in full; the person grades the 4 checks pass or fail per case. */
export function explainRows(cases: readonly ExplainSourceCase[]): CsvRow[] {
  return cases.map((c) => {
    const business = (c.input.business ?? {}) as Record<string, unknown>;
    const reasons = (c.output.reasons ?? []).map((r, i) => {
      const reason = (r ?? {}) as Record<string, unknown>;
      const steps = Array.isArray(reason.steps) ? reason.steps.map(text).join(" / ") : text(reason.steps);
      const prompt = text(reason.copy_for_claude);
      return `${i + 1}. ${text(reason.title)} [${text(reason.impact)}]\n   Evidence: ${text(reason.evidence)}\n   Why it matters: ${text(reason.why_it_matters)}\n   Steps: ${steps}${prompt ? `\n   Copy for Claude: ${prompt}` : ""}`;
    });
    return {
      id: c.id,
      business: [business.name, business.city].filter(Boolean).join(", "),
      facts: JSON.stringify(c.input, null, 1),
      reasons: reasons.join("\n"),
    };
  });
}

export function explainCases(rows: readonly CsvRow[], source: readonly ExplainSourceCase[], labelledBy: string, labelledAt: string): Imported {
  const byId = new Map(source.map((c) => [c.id, c]));
  const cases: Record<string, unknown>[] = [];
  const problems: string[] = [];
  let unlabelled = 0;
  rows.forEach((r, i) => {
    const verdicts = VERDICTS.map((v) => yesNo(r[v]));
    if (verdicts.every((v) => v === null)) {
      unlabelled++;
      return;
    }
    const at = `row ${i + 2} (${r.id})`;
    if (verdicts.some((v) => v === null)) {
      problems.push(`${at}: grade all 4 checks pass or fail`);
      return;
    }
    const c = byId.get(r.id);
    if (!c) {
      problems.push(`${at}: not in the cases file`);
      return;
    }
    const [grounded, specific, actionable, noInventedNumbers] = verdicts as boolean[];
    cases.push({
      id: c.id,
      input: c.input,
      calibration: { output: c.output, human: { grounded, specific, actionable, noInventedNumbers } },
      labelledBy,
      labelledAt,
      ...(r.note ? { note: r.note } : {}),
    });
  });
  return { cases, problems, unlabelled };
}
