// What the fix wording writer is given, built from the template fixes and the frozen snapshot, and the numbers
// its answer may use. Pure.
import type { FixWordingInput, FixWordingItem } from "@/modules/reports/prompts/fix-wording.v1";
import { AREA_LABELS, type ReportFix, type ReportSnapshot } from "../snapshot-schema";

// Digits with optional decimals or thousands separators: 9, 15.5, 1,200. A percent sign stays outside the match.
export const NUMBER = /\d+(?:[.,]\d+)*/g;
/** Step counts and fix numbers ("Fix 2", "these 3 steps") may always be written. */
export const SMALL_COUNTS = ["1", "2", "3", "4"];

export const normNumber = (n: string) => n.replace(/,/g, "");

function collect(value: unknown, out: Set<string>): void {
  if (typeof value === "number") out.add(normNumber(String(value)));
  else if (typeof value === "string") for (const n of value.match(NUMBER) ?? []) out.add(normNumber(n));
  else if (Array.isArray(value)) for (const v of value) collect(v, out);
  else if (value && typeof value === "object") for (const v of Object.values(value)) collect(v, out);
}

export function numbersIn(value: unknown): Set<string> {
  const out = new Set<string>();
  collect(value, out);
  return out;
}

/**
 * Every number the report states, plus 1 to 4. The agency block is left out: its accent colour, logo path and
 * email hold digits that are not facts about the business.
 */
export function snapshotNumbers(snapshot: ReportSnapshot): Set<string> {
  const out = numbersIn({ ...snapshot, agency: null });
  for (const n of SMALL_COUNTS) out.add(n);
  return out;
}

/** Business, competitor and excerpt names in the report, longest first, so a name holding digits is not a number. */
export function knownNames(snapshot: ReportSnapshot): string[] {
  const names = [
    snapshot.business.name,
    ...snapshot.businesses.map((b) => b.name),
    snapshot.rank?.leader?.name,
    snapshot.knows.excerpts.named?.name,
    snapshot.knows.excerpts.competitor?.name,
    ...snapshot.coverage.engines,
    snapshot.business.market,
  ];
  const unique = [...new Set(names.filter((n): n is string => Boolean(n && n.trim())))];
  return unique.sort((a, b) => b.length - a.length);
}

function fixItem(fix: ReportFix): FixWordingItem {
  const own = { evidence: fix.evidence, where: fix.where, goal: fix.goal, draft: [fix.title, fix.why, ...fix.steps] };
  return {
    key: fix.key,
    n: fix.n,
    areas: fix.areas.map((a) => AREA_LABELS[a]),
    where: fix.where,
    priority: fix.priority,
    impact: fix.impact,
    effort: fix.effort,
    evidence: fix.evidence,
    goal: fix.goal,
    draft: { title: fix.title, why: fix.why, steps: fix.steps },
    numbers: [...numbersIn(own)],
  };
}

export function buildFixWordingInput(fixes: ReportFix[], snapshot: ReportSnapshot): FixWordingInput {
  const you = snapshot.business.name.trim().toLowerCase();
  return {
    business: { name: snapshot.business.name, market: snapshot.business.market, website: snapshot.business.domain },
    assistants: snapshot.coverage.engines,
    otherBusinesses: snapshot.businesses.filter((b) => !b.isYou && b.name.trim().toLowerCase() !== you).map((b) => b.name),
    fixes: fixes.map(fixItem),
  };
}
