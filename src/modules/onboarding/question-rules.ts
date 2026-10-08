// Pure rules for question picking (MVP_SPEC 5.3): check what the model returned, keep the intent mix,
// fill the city, and plain questions that fit any business as the last fallback.
import { placeLabel } from "@/lib/place-label";
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
  return placeLabel(city, region);
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

// Plain questions that read right for any business, a shop or a restaurant as much as a trade (BUG-084). The
// old template engine asked about "same-day or emergency service" and what a "clothing store typically costs".
const FALLBACK: { template: string; intent: Intent }[] = [
  { template: "What is the best {industry} in {city}?", intent: "best" },
  { template: "Can you recommend a good {industry} in {city}?", intent: "best" },
  { template: "Which {industry} in {city} do locals recommend?", intent: "best" },
  { template: "I'm looking for a good {industry} in {city}. Which one should I choose?", intent: "best" },
  { template: "Which {industry} in {city} has the best reviews?", intent: "reviews" },
  { template: "What is the most trusted {industry} in {city}?", intent: "reviews" },
  { template: "What is the most popular {industry} in {city}?", intent: "reviews" },
  { template: "Which {industry} in {city} offers the best value?", intent: "comparison" },
  { template: "How do the top {industry} options in {city} compare?", intent: "comparison" },
  { template: "Which {industry} in {city} has fair prices?", intent: "price" },
  { template: "What is an affordable {industry} in {city}?", intent: "price" },
  { template: "Which {industry} in {city} is open now?", intent: "urgent" },
];

/** "Coffee shop" reads as "coffee shop" mid-sentence; "HVAC contractor" keeps its capitals. */
function midSentence(label: string): string {
  return label
    .trim()
    .split(/\s+/)
    .map((w) => (w.length > 1 && w === w.toUpperCase() ? w : w.toLowerCase()))
    .join(" ");
}

/** Used when Claude fails, and to fill a short written list. */
export function fallbackQuestions(industry: string, city: string, region: string | null): PreparedQuestion[] {
  const where = cityLabel(city, region);
  const noun = midSentence(industry) || "local business";
  return FALLBACK.map((q) => ({ text: fillCity(q.template.replace("{industry}", noun), where), intent: q.intent, templateId: null }));
}
