import type { Intent } from "@/modules/question-library";
import { cityLabel, fillCity, type PreparedQuestion } from "./question-rules";

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
  { template: "Which of the top {industry} options in {city} compares best?", intent: "comparison" },
  { template: "Which {industry} in {city} has fair prices?", intent: "price" },
  { template: "What is an affordable {industry} in {city}?", intent: "price" },
  { template: "Which {industry} in {city} is the most highly rated?", intent: "reviews" },
];

/** "Coffee shop" reads as "coffee shop" mid-sentence; "HVAC contractor" keeps its capitals. */
function midSentence(label: string): string {
  return label
    .trim()
    .split(/\s+/)
    .map((w) => (w.length > 1 && w === w.toUpperCase() ? w : w.toLowerCase()))
    .join(" ");
}

/** Used when Claude fails, and to fill a short written list: plain questions that read right for any business. */
export function fallbackQuestions(industry: string, city: string, region: string | null): PreparedQuestion[] {
  const where = cityLabel(city, region);
  const noun = midSentence(industry) || "local business";
  return FALLBACK.map((q) => ({ text: fillCity(q.template.replace("{industry}", noun), where), intent: q.intent, templateId: null }));
}
