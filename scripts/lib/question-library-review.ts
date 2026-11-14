// The B-32 review aid: one spreadsheet row per library template with automatic flags a person checks first, and the
// way back from the edited spreadsheet to the library file. The file stays a draft: approving it is a person's job
// (status and review set by hand, MVP_SPEC 25 principle 6). Pure, so it is unit tested.
import { INTENTS, type Intent, type LibraryFile, type LibraryTemplate } from "@/modules/question-library";
import { namesBrand } from "@/modules/onboarding/question-brands";
import { LIBRARY_INDUSTRIES, type LibraryIndustry } from "@/lib/industries";
import { splitList, type CsvRow } from "./csv";

export const REVIEW_COLUMNS = [
  "id",
  "industry",
  "intent",
  "template",
  "tags",
  "source",
  "flags",
  "action",
  "new_template",
  "new_tags",
  "new_intent",
  "reviewer_note",
] as const;

/** A template in the file, with the optional marker for templates a person or agent added by hand. */
export type ReviewTemplate = LibraryTemplate & { source?: string };

const STOP = new Set(["a", "an", "the", "in", "for", "to", "of", "and", "or", "is", "are", "who", "what", "which", "where", "i", "my", "me", "do", "does", "can", "any", "there", "should", "with", "on", "at", "near", "city", "whos", "whats", "wheres", "hows", "how", "im", "id", "ive", "get", "find", "good"]);

function words(template: string): Set<string> {
  return new Set(
    template
      .toLowerCase()
      .replace(/\{city\}/g, " ")
      .replace(/[’']/g, "")
      .split(/[^a-z0-9]+/)
      .filter((w) => w && !STOP.has(w)),
  );
}

/** How alike two templates are: shared meaningful words over all of them (Jaccard). */
export function similarity(a: string, b: string): number {
  const x = words(a);
  const y = words(b);
  if (!x.size && !y.size) return 1;
  let shared = 0;
  for (const w of x) if (y.has(w)) shared++;
  return shared / (x.size + y.size - shared);
}

const NEAR_DUPLICATE = 0.75;

// Words that show a template's intent. A template whose wording has none of its intent's words is flagged for a look,
// not rejected: a person decides. "best" is the general intent, so any wording fits it and it is never flagged.
const INTENT_WORDS: Record<Exclude<Intent, "best">, RegExp> = {
  urgent:
    /\b(emergenc\w*|urgent\w*|same[- ]day|tonight|today|right (?:now|away)|now|asap|open late|late|early|quick\w*|fast|24|weekend|last[- ]minute|soon|immediate\w*|walk[- ]ins?|short notice|just|need\w* (?:help|someone)|broke|broken|leak\w*|flood\w*|stuck|tow\w*)\b/i,
  price:
    /\b(prices?|priced|pricing|costs?|cheap\w*|affordab\w*|budget|deals?|fees?|rates?|value|free|discounts?|specials?|expensive|financ\w*|payment\w*|pay|insurance|how much|quotes?|reasonabl\w*|loyalty|estimates?|money)\b/i,
  reviews:
    /\b(reviews?|reviewed|rated|ratings?|trust\w*|reputation|stars?|recommend\w*|rave|everyone|people say|say|says|highly|praised|feedback|word of mouth|testimonials?|known for|regulars)\b/i,
  comparison: /\b(vs\.?|versus|compare\w*|comparison|better|difference|between|or|which (?:is|one|place|has)|choose|decide|instead)\b/i,
};

// A core word of another industry shows a template that may belong elsewhere ("cozy cafe" under restaurant).
// "other" has no words of its own, so it never matches and is never matched.
const INDUSTRY_WORDS: Partial<Record<string, RegExp>> = {
  dentist: /\b(dentists?|dental|teeth|orthodont\w*)\b/i,
  lawyer: /\b(lawyers?|attorneys?|law firm|legal)\b/i,
  restaurant: /\b(restaurants?|dining|dinner|lunch|brunch|eat|food)\b/i,
  coffee_shop: /\b(coffee|caf[eé]s?|espresso|latte)\b/i,
  plumber: /\b(plumbers?|plumbing|drains?|pipes?|water heater)\b/i,
  hvac: /\b(hvac|air condition\w*|ac|furnace|heating|heat pump)\b/i,
  med_spa: /\b(med spa|botox|facials?|laser|filler|injectables?)\b/i,
  real_estate: /\b(realtors?|real estate|agents?|homes?|house|listing)\b/i,
  auto_repair: /\b(mechanics?|auto repair|car|brakes?|oil change|transmission)\b/i,
  salon: /\b(salons?|haircuts?|hair|stylists?|nails?|blowouts?)\b/i,
};

// Wording a person asked us to watch for (MVP test, 2026-11-14): fast food questions given to sit-down restaurants.
const RESTAURANT_STYLE = /\b(fast[- ]food|drive[- ]thru|drive[- ]through|value menu|combo meal)\b/i;

/** The automatic flags for one template, given the other templates of its industry. */
export function flagsFor(t: ReviewTemplate, sameIndustry: readonly ReviewTemplate[]): string[] {
  const flags: string[] = [];
  const text = t.template.trim();
  const cities = text.split("{city}").length - 1;
  if (cities !== 1) flags.push(cities === 0 ? "missing {city}" : "{city} more than once");
  const count = text.replace("{city}", "City").split(/\s+/).length;
  if (count < 6) flags.push("very short");
  if (count > 22 || text.length > 140) flags.push("long");
  if (/\bnear me\b|\bnearby\b|\bclose to me\b|\baround here\b/i.test(text)) flags.push("near me wording");
  if (namesBrand(text.replace("{city}", "Springfield"), ["Springfield"])) flags.push("names a brand or proper noun");
  if (t.intent !== "best" && !INTENT_WORDS[t.intent].test(text)) flags.push(`intent "${t.intent}" not clear from the wording`);
  for (const other of LIBRARY_INDUSTRIES) {
    if (other !== t.industry && INDUSTRY_WORDS[other]?.test(text) && !INDUSTRY_WORDS[t.industry]?.test(text)) {
      flags.push(`sounds like ${other.replace("_", " ")}`);
      break;
    }
  }
  if (t.industry === "restaurant" && RESTAURANT_STYLE.test(text) && !t.tags.some((tag) => RESTAURANT_STYLE.test(tag))) {
    flags.push("fast food wording without a fast food tag");
  }
  for (const o of sameIndustry) {
    if (o === t) continue;
    if (o.template.trim().toLowerCase() === text.toLowerCase()) {
      flags.push("exact duplicate");
      break;
    }
    if (similarity(o.template, text) >= NEAR_DUPLICATE) {
      flags.push(`near duplicate of "${o.template.trim()}"`);
      break;
    }
  }
  if (t.source) flags.push(`added by hand (${t.source}): check it`);
  return flags;
}

/** Stable row id from the template's place in the file, e.g. "qlt-012". */
export function rowId(index: number): string {
  return `qlt-${String(index + 1).padStart(3, "0")}`;
}

export function reviewRows(templates: readonly ReviewTemplate[]): CsvRow[] {
  const byIndustry = new Map<string, ReviewTemplate[]>();
  for (const t of templates) byIndustry.set(t.industry, [...(byIndustry.get(t.industry) ?? []), t]);
  return templates.map((t, i) => ({
    id: rowId(i),
    industry: t.industry,
    intent: t.intent,
    template: t.template,
    tags: t.tags.join(" | "),
    source: t.source ?? "",
    flags: flagsFor(t, byIndustry.get(t.industry) ?? []).join("; "),
    action: "keep",
  }));
}

export type IndustrySummary = { industry: string; templates: number; byIntent: Record<Intent, number>; thinIntents: Intent[] };

/** Templates per industry and per intent; an intent with fewer than `thin` templates is listed as thin. */
export function summary(templates: readonly ReviewTemplate[], thin = 6): IndustrySummary[] {
  return LIBRARY_INDUSTRIES.map((industry) => {
    const own = templates.filter((t) => t.industry === industry);
    const byIntent = Object.fromEntries(INTENTS.map((i) => [i, own.filter((t) => t.intent === i).length])) as Record<
      Intent,
      number
    >;
    return { industry, templates: own.length, byIntent, thinIntents: INTENTS.filter((i) => byIntent[i] < thin) };
  });
}

export class ReviewImportError extends Error {
  constructor(readonly problems: string[]) {
    super(`The review sheet has ${problems.length} problem(s):\n- ${problems.join("\n- ")}`);
  }
}

/**
 * The library file with the person's decisions applied: keep, edit (new_template / new_tags / new_intent), delete, or
 * add (a row with action "add" and no id). Status and review are never changed here: approval stays a separate,
 * deliberate step. Throws with every problem listed, so a person fixes the sheet once.
 */
export function applyReview(file: LibraryFile & { templates: ReviewTemplate[] }, rows: readonly CsvRow[]) {
  const problems: string[] = [];
  const decisions = new Map<string, CsvRow>();
  const added: ReviewTemplate[] = [];
  const isIntent = (v: string): v is Intent => (INTENTS as readonly string[]).includes(v);
  const isIndustry = (v: string): v is LibraryIndustry => (LIBRARY_INDUSTRIES as readonly string[]).includes(v);

  rows.forEach((row, i) => {
    const at = `row ${i + 2}${row.id ? ` (${row.id})` : ""}`;
    const action = (row.action || "keep").toLowerCase();
    if (!["keep", "edit", "delete", "add"].includes(action)) {
      problems.push(`${at}: action must be keep, edit, delete or add, not "${row.action}"`);
      return;
    }
    if (action === "add") {
      const template = row.new_template || row.template;
      const intent = row.new_intent || row.intent;
      const tags = splitList(row.new_tags || row.tags);
      if (!isIndustry(row.industry)) problems.push(`${at}: add needs a library industry, not "${row.industry}"`);
      if (!isIntent(intent)) problems.push(`${at}: add needs an intent (${INTENTS.join(", ")})`);
      if (!template) problems.push(`${at}: add needs a template`);
      if (isIndustry(row.industry) && isIntent(intent) && template) {
        added.push({ industry: row.industry, intent, template, tags, source: "review-added" });
      }
      return;
    }
    if (!/^qlt-\d+$/.test(row.id)) {
      problems.push(`${at}: unknown id "${row.id}" (only "add" rows may leave the id empty)`);
      return;
    }
    if (decisions.has(row.id)) problems.push(`${at}: ${row.id} appears twice`);
    if (action === "edit" && !row.new_template && !row.new_tags && !row.new_intent) {
      problems.push(`${at}: edit needs new_template, new_tags or new_intent`);
    }
    if (row.new_intent && !isIntent(row.new_intent)) problems.push(`${at}: new_intent "${row.new_intent}" is not an intent`);
    decisions.set(row.id, { ...row, action });
  });

  const templates: ReviewTemplate[] = [];
  file.templates.forEach((t, i) => {
    const row = decisions.get(rowId(i));
    if (!row) {
      problems.push(`${rowId(i)} ("${t.template}") is missing from the sheet; keep every row and mark it`);
      return;
    }
    if (row.action === "delete") return;
    if (row.action === "edit") {
      const { source: _source, ...rest } = t as typeof t & { source?: string };
      templates.push({
        ...rest,
        template: row.new_template || t.template,
        tags: row.new_tags ? splitList(row.new_tags) : t.tags,
        intent: (row.new_intent as Intent) || t.intent,
      });
      return;
    }
    templates.push(t);
  });
  for (const id of decisions.keys()) {
    const index = Number(id.slice(4)) - 1;
    if (index < 0 || index >= file.templates.length) problems.push(`${id} is not in the library file`);
  }
  if (problems.length) throw new ReviewImportError(problems);
  return { ...file, templates: [...templates, ...added] };
}
