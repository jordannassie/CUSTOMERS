// Questions about the business's own part of the city (BUG-131). Pure.
import { cityLabel, type PreparedQuestion } from "./question-rules";

/** How many of the 12 ask about the business's own part of the city when it has one. */
export const AREA_QUESTIONS = 4;

/**
 * "East Austin, TX" or "Hyde Park, Austin, TX": the area with the city it is in. Questions keep the city so the
 * AI knows which East Austin, and businesses in the same area share the wording (and the answer cache).
 */
export function areaLabel(area: string, city: string, region: string | null): string {
  const where = cityLabel(city, region);
  const inName = new RegExp(`\\b${city.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(area);
  return inName ? where.replace(city.trim(), area.trim()) : `${area.trim()}, ${where}`;
}

/**
 * A small shop measured only against its whole city always looks invisible (BUG-131). With an area set, a few of
 * the "best", "reviews" and "price" questions ask about the area instead; the rest stay city-wide.
 */
export function withArea(questions: PreparedQuestion[], business: { area?: string | null; city: string; region: string | null }): PreparedQuestion[] {
  const area = business.area?.trim();
  if (!area) return questions;
  const city = cityLabel(business.city, business.region);
  const local = areaLabel(area, business.city, business.region);
  if (local === city) return questions;
  const order = ["best", "reviews", "price", "best", "comparison", "reviews"];
  const chosen = new Set<number>();
  for (const intent of order) {
    if (chosen.size >= AREA_QUESTIONS) break;
    const i = questions.findIndex((q, n) => !chosen.has(n) && q.intent === intent && q.text.includes(city));
    if (i >= 0) chosen.add(i);
  }
  return questions.map((q, n) => (chosen.has(n) ? { ...q, text: q.text.replace(city, local) } : q));
}
