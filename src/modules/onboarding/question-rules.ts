// Pure rules for question picking (MVP_SPEC 5.3): check what the model returned, keep the intent mix,
// fill the city, and the old template engine as the last fallback.
import { generateBuyerIntentPrompts } from "@/lib/geo/prompt-engine";
import type { Intent } from "@/modules/question-library";
import { MAX_PER_INTENT, QUESTION_COUNT } from "./prompts/pick-questions.v1";

export type LibraryEntry = { id: string; template: string; tags: string[]; intent: Intent };

export type PreparedQuestion = {
  text: string;
  intent: Intent;
  /** question_library row the question came from; null when written by the model or the fallback. */
  templateId: string | null;
};

const CITY = "{city}";

export function cityLabel(city: string, region: string | null): string {
  return [city.trim(), region?.trim()].filter(Boolean).join(", ");
}

export function fillCity(template: string, city: string): string {
  return template.replace(CITY, city).replace(/\s+/g, " ").trim();
}

/** Same rules as the library (question-library/validate.ts): one {city}, no other placeholder, a question. */
export function isUsableTemplate(template: string): boolean {
  const t = template.trim();
  if (t.split(CITY).length !== 2) return false;
  if ((t.match(/\{[^}]*\}/g) ?? []).some((p) => p !== CITY)) return false;
  return t.endsWith("?") && t.length <= 200;
}

const words = (s: string) => new Set(s.toLowerCase().match(/[a-z0-9]+/g) ?? []);

/** How many of the business's service words a template's tags or text mention; breaks top-up ties. */
export function serviceFit(entry: Pick<LibraryEntry, "template" | "tags">, services: string[]): number {
  const have = words(`${entry.tags.join(" ")} ${entry.template}`);
  return services.reduce((n, s) => n + [...words(s)].filter((w) => w.length > 2 && have.has(w)).length, 0);
}

/**
 * Keeps the model's choices in its order, drops repeats and anything past MAX_PER_INTENT, then tops up
 * to QUESTION_COUNT preferring intents still missing and templates closest to the services.
 */
export function balancePicks<T extends Pick<LibraryEntry, "template" | "tags" | "intent">>(
  chosen: T[],
  pool: T[],
  services: string[],
): T[] {
  const picked: T[] = [];
  const perIntent = new Map<Intent, number>();
  const seen = new Set<string>();
  const add = (t: T) => {
    const key = t.template.trim().toLowerCase();
    if (seen.has(key) || (perIntent.get(t.intent) ?? 0) >= MAX_PER_INTENT || picked.length >= QUESTION_COUNT) return;
    seen.add(key);
    perIntent.set(t.intent, (perIntent.get(t.intent) ?? 0) + 1);
    picked.push(t);
  };
  chosen.forEach(add);
  let rest = pool.filter((t) => !seen.has(t.template.trim().toLowerCase()));
  while (picked.length < QUESTION_COUNT) {
    rest = rest.filter((t) => !seen.has(t.template.trim().toLowerCase()) && (perIntent.get(t.intent) ?? 0) < MAX_PER_INTENT);
    if (!rest.length) break;
    const count = (t: T) => perIntent.get(t.intent) ?? 0;
    add(rest.reduce((best, t) => (count(t) < count(best) || (count(t) === count(best) && serviceFit(t, services) > serviceFit(best, services)) ? t : best)));
  }
  return picked;
}

const FALLBACK_INTENTS: Record<string, Intent> = {
  discovery: "best",
  local_presence: "reviews",
  comparison: "comparison",
  transactional: "urgent",
  pricing: "price",
};

/** The old template engine (src/lib/geo/prompt-engine.ts), used only when Claude fails. */
export function fallbackQuestions(industryLabel: string, city: string, region: string | null): PreparedQuestion[] {
  const where = cityLabel(city, region);
  const pool = generateBuyerIntentPrompts({ industry: industryLabel.toLowerCase(), city: city.trim(), region: region?.trim() || null })
    .filter((p) => p.prompt.includes(where) && FALLBACK_INTENTS[p.category])
    .map((p) => ({ template: p.prompt, tags: [] as string[], intent: FALLBACK_INTENTS[p.category] }));
  return balancePicks([], pool, []).map((p) => ({ text: p.template, intent: p.intent, templateId: null }));
}
