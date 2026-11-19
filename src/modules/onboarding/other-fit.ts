// Fit check for an "Other" business's written questions (2026-10-16, prompt question-fit.v1). One cheap call checks
// all of them at once; the ones that do not fit are replaced with newly written questions, the replacements are
// checked once more, and anything still failing is replaced with plain questions that fit any business of the kind.
// A failed call keeps the questions as they are: the check can only make a set better, never stop onboarding.
import type { CheckFit } from "./question-model";
import { balancePicks, type PreparedQuestion } from "./question-rules";
import { questionKey } from "./question-style";
import { FIT_PROMPT_VERSION, MAX_FIT_ROUNDS, type FitBusiness } from "./prompts/question-fit.v1";

export type FitReport = {
  promptVersion: string;
  /** Fit calls that answered (at most MAX_FIT_ROUNDS). */
  rounds: number;
  /** Questions sent to the check, over all rounds. */
  checked: number;
  /** Questions the check said do not fit, in the order found. */
  rejected: string[];
  /** Questions in the final set that were not in the first one. */
  replaced: number;
  /** Rejected questions kept anyway because nothing else could fill the set. */
  keptAnyway: number;
  /** Why a fit call failed, for logs only; the questions stay as they were. */
  error: string | null;
};

export type FitDeps = {
  check: CheckFit;
  business: FitBusiness;
  /** A fresh batch of written questions (same rules as the first); may fail, then plain questions fill in. */
  writeMore: () => Promise<PreparedQuestion[]>;
  /** Plain questions for the kind of business, the last resort. */
  plain: PreparedQuestion[];
  services: string[];
};

type Entry = { template: string; tags: string[]; intent: PreparedQuestion["intent"]; question: PreparedQuestion };
const entry = (q: PreparedQuestion): Entry => ({ template: q.text, tags: [], intent: q.intent, question: q });
const key = (q: PreparedQuestion) => questionKey(q.text);

/** Keeps `have`, then tops it up from each pool in turn, with the usual intent mix and no repeats. */
function topUp(have: PreparedQuestion[], pools: PreparedQuestion[][], services: string[]): PreparedQuestion[] {
  let set = have.map(entry);
  for (const pool of pools) set = balancePicks(set, pool.map(entry), services);
  return set.map((e) => e.question);
}

export async function fitOtherQuestions(questions: PreparedQuestion[], deps: FitDeps): Promise<{ questions: PreparedQuestion[]; report: FitReport }> {
  const first = new Set(questions.map(key));
  const rejected: PreparedQuestion[] = [];
  const rejectedKeys = new Set<string>();
  const fresh = (pool: PreparedQuestion[]) => pool.filter((q) => !rejectedKeys.has(key(q)));
  const report: FitReport = { promptVersion: FIT_PROMPT_VERSION, rounds: 0, checked: 0, rejected: [], replaced: 0, keptAnyway: 0, error: null };
  let set = questions;
  let toCheck = questions;

  for (let round = 1; round <= MAX_FIT_ROUNDS && toCheck.length > 0; round++) {
    let verdicts: boolean[];
    try {
      verdicts = await deps.check({ business: deps.business, questions: toCheck.map((q) => q.text) });
    } catch (err) {
      report.error = err instanceof Error ? err.message : String(err);
      break;
    }
    report.rounds = round;
    report.checked += toCheck.length;
    const misfits = toCheck.filter((_, i) => verdicts[i] === false);
    if (misfits.length === 0) break;
    for (const q of misfits) {
      rejected.push(q);
      rejectedKeys.add(key(q));
    }
    const keep = set.filter((q) => !rejectedKeys.has(key(q)));
    const last = round === MAX_FIT_ROUNDS;
    // Only one more batch is written (before the last check); after the last check plain questions fill in.
    const written = last ? [] : await deps.writeMore().catch(() => []);
    let next = topUp(keep, [fresh(written), fresh(deps.plain)], deps.services);
    // Never fewer questions than before: a misfit stays when nothing else fits the intent mix.
    if (next.length < set.length) {
      const before = next.length;
      next = topUp(next, [rejected], deps.services).slice(0, set.length);
      report.keptAnyway += next.length - before;
    }
    const kept = new Set(keep.map(key));
    toCheck = last ? [] : next.filter((q) => !kept.has(key(q)) && !rejectedKeys.has(key(q)));
    set = next;
  }

  report.rejected = rejected.map((q) => q.text);
  report.replaced = set.filter((q) => !first.has(key(q))).length;
  return { questions: set, report };
}

/** One line for the server log. */
export function describeFit(type: string, r: FitReport): string {
  const head = `Question fit (${r.promptVersion}) for "${type}": ${r.rounds} round(s), ${r.checked} checked, ${r.rejected.length} did not fit, ${r.replaced} replaced`;
  const kept = r.keptAnyway ? `, ${r.keptAnyway} kept with nothing to replace them` : "";
  const failed = r.error ? `; the check failed, questions kept as written: ${r.error}` : "";
  const list = r.rejected.length ? `. Did not fit: ${r.rejected.map((q) => JSON.stringify(q)).join("; ")}` : "";
  return `${head}${kept}${failed}${list}`;
}
