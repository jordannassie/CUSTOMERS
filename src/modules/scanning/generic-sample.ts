// Test mode's fallback answer (D-61, MVP test 2026-11-14): when no recorded answer fits the business's trade and city
// (recorded.ts covers coffee shops, dentists and plumbers in Austin and Orange), the check gets a plain sample answer
// built from the business's own name, competitors, trade and city, instead of failing with "No sample answers". It is
// saved as a sample like any recorded answer, costs nothing and calls no AI. The same question and AI always give the
// same answer, so repeated test scans read the same. The business is named in about a third of the answers. Pure.
import { createHash } from "node:crypto";

export type SampleSubject = { business: string; competitors: string[]; kind: string | null | undefined };

export type GenericSample = { answerText: string; citations: { url: string; title: string | null }[]; names: string[] };

const REASONS = ["well reviewed for friendly service", "a popular local choice with fair prices", "often mentioned for quick, reliable work"];

function seedOf(text: string): number {
  return createHash("sha256").update(text).digest().readUInt32BE(0);
}

function kindLabel(kind: string | null | undefined): string {
  const label = kind?.trim().replace(/[_-]+/g, " ").toLowerCase();
  return label || "local business";
}

/** Three names for the answer: the business itself in about one answer in three, then competitors, then fillers. */
export function sampleNames(subject: SampleSubject, seed: number, city: string): string[] {
  const label = kindLabel(subject.kind);
  const title = label.replace(/\b\w/g, (c) => c.toUpperCase());
  const fillers = [`${city || "Downtown"} ${title} Co.`, `Main Street ${title}`, `Corner ${title}`];
  const others = [...subject.competitors.filter((n) => n && n !== subject.business), ...fillers];
  const start = seed % others.length;
  const rotated = [...others.slice(start), ...others.slice(0, start)].slice(0, 3);
  if (seed % 3 !== 0 || !subject.business) return rotated;
  const at = (seed >>> 2) % 3;
  return [...rotated.slice(0, at), subject.business, ...rotated.slice(at)].slice(0, 3);
}

export function genericSampleAnswer(subject: SampleSubject, question: string, provider: string, city: string | null | undefined): GenericSample {
  const where = city?.trim() || "your area";
  const seed = seedOf(`${provider}\n${question.trim().toLowerCase()}`);
  const names = sampleNames(subject, seed, city?.trim() ?? "");
  const label = kindLabel(subject.kind);
  const lines = names.map((name, i) => `${i + 1}. **${name}**: ${REASONS[(seed + i) % REASONS.length]}.`);
  const answerText = [
    `Here are a few ${label} options people in ${where} often recommend:`,
    "",
    ...lines,
    "",
    "Check recent reviews and opening hours before you go.",
  ].join("\n");
  const search = `https://www.yelp.com/search?find_desc=${encodeURIComponent(label)}&find_loc=${encodeURIComponent(where)}`;
  return { answerText, citations: [{ url: search, title: `Best ${label} in ${where}` }], names };
}
