// The optional AI wording step for the report's fixes (fix-wording.v1). The fixes arrive built in code with template
// wording; one call asks the writer to rewrite every fix's title, why and steps from the same facts. Each rewritten
// fix is checked (validate.ts): one that passes is kept and marked "ai", one that fails keeps its template text. A
// failed call keeps every template and is logged, never thrown. Test agencies never call the writer (D-61). The
// writer is injected, so tests and evals run this exact flow on fixtures. Pure apart from the writer and the log.
import type { FixWordingInput, FixWordingOutput } from "@/modules/reports/prompts/fix-wording.v1";
import type { ReportFix, ReportSnapshot } from "../snapshot-schema";
import { buildFixWordingInput } from "./input";
import { fixWordingIssues, wordingContext } from "./validate";

export type FixWordingResult = {
  output: FixWordingOutput;
  model: string;
  usage: { inputTokens: number; outputTokens: number } | null;
  /** Which provider answered: Claude, or the ChatGPT backup (D-84). */
  provider?: "anthropic" | "openai";
};

export type FixWordingWriter = (input: FixWordingInput) => Promise<FixWordingResult>;

export type WordFixesOptions = {
  /** Null or left out: the template wording is kept (no API key, or REPORT_AI_WORDING is off). */
  writer?: FixWordingWriter | null;
  /** Test agencies never call AI (D-61). */
  isTest?: boolean;
  /** Where fallbacks are reported; console.warn by default. */
  log?: (message: string) => void;
};

/** What happened to each fix, for logs and the eval. */
export type WordingReport = {
  called: boolean;
  model: string | null;
  kept: string[];
  dropped: { key: string; issues: string[] }[];
  error: string | null;
};

export async function wordFixesWithReport(
  fixes: ReportFix[],
  snapshot: ReportSnapshot,
  opts: WordFixesOptions = {},
): Promise<{ fixes: ReportFix[]; report: WordingReport }> {
  const report: WordingReport = { called: false, model: null, kept: [], dropped: [], error: null };
  if (opts.isTest || !opts.writer || fixes.length === 0) return { fixes, report };
  const log = opts.log ?? ((m: string) => console.warn(m));

  let written: FixWordingResult;
  report.called = true;
  try {
    written = await opts.writer(buildFixWordingInput(fixes, snapshot));
  } catch (err) {
    report.error = err instanceof Error ? err.message : String(err);
    log(`Report fix wording failed, kept the template wording: ${report.error}`);
    return { fixes, report };
  }
  report.model = written.model;

  const ctx = wordingContext(snapshot);
  const byKey = new Map<string, FixWordingOutput["fixes"][number]>();
  // The first answer for a key wins; a key the input did not have is ignored.
  for (const w of written.output.fixes) if (!byKey.has(w.key)) byKey.set(w.key, w);

  const out = fixes.map((fix) => {
    const w = byKey.get(fix.key);
    const issues = w ? fixWordingIssues(w, ctx) : ["no rewrite returned"];
    if (!w || issues.length) {
      report.dropped.push({ key: fix.key, issues });
      return fix;
    }
    report.kept.push(fix.key);
    return { ...fix, title: w.title.trim(), why: w.why.trim(), steps: w.steps.map((s) => s.trim()), wording: "ai" as const };
  });
  if (report.dropped.length) {
    const lines = report.dropped.map((d) => `${d.key}: ${d.issues.join(", ")}`).join("; ");
    log(`Report fix wording: ${report.dropped.length} of ${fixes.length} fixes kept the template wording (${lines})`);
  }
  return { fixes: out, report };
}

/** The fixes with checked AI wording where it passed, and the template wording everywhere else. Never throws. */
export async function wordFixes(fixes: ReportFix[], snapshot: ReportSnapshot, opts: WordFixesOptions = {}): Promise<ReportFix[]> {
  return (await wordFixesWithReport(fixes, snapshot, opts)).fixes;
}
