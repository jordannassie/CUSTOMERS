// What a scan asks (MVP_SPEC 5.2): each active question, with the business city, on each chosen AI model.
import { placeLabel } from "@/lib/place-label";
import { checkIdFor, type CheckTask } from "./check";
import { countryCode } from "./country";
import type { CheckLocation, ProviderId } from "./providers/types";
import type { ScanTargetRow } from "./runs/dal";

export const PROVIDERS: ProviderId[] = ["openai", "anthropic", "perplexity"];

export function isProvider(model: string): model is ProviderId {
  return (PROVIDERS as string[]).includes(model);
}

/** Why this business cannot be scanned, or null. */
export function scanBlocker({ business, questions }: ScanTargetRow): string | null {
  if (business.deletedAt) return "This business was deleted.";
  if (business.status === "paused") return "This business is paused.";
  if (!business.city) return "Add the business city before scanning.";
  if (questions.length === 0) return "This business has no active questions.";
  if (!business.models.some(isProvider)) return "Choose at least one AI model to check.";
  return null;
}

export function checkTasks(jobId: string, { business, questions }: ScanTargetRow): CheckTask[] {
  const models = business.models.filter(isProvider);
  return questions.flatMap((q) =>
    models.map((provider) => ({
      checkId: checkIdFor(jobId, q.id, provider),
      promptId: q.id,
      provider,
      question: withCity(q.prompt, business.city!, business.region),
    })),
  );
}

/** MVP_SPEC 5.2 step 1: every question names the business city. */
export function withCity(question: string, city: string, region: string | null): string {
  const text = question.trim();
  if (text.toLowerCase().includes(city.toLowerCase())) return text;
  const place = placeLabel(city, region);
  return `${text.replace(/[?.!\s]+$/, "")} in ${place}?`;
}

export function locationOf(business: ScanTargetRow["business"]): CheckLocation {
  return { city: business.city ?? "", region: business.region ?? "", country: countryCode(business.country) };
}

/** Credits a scan holds, counted like checkTasks: each active question on each chosen AI model (D-54). */
export function scanCheckCount(activeQuestions: number, models: string[]): number {
  return activeQuestions * models.filter(isProvider).length;
}
