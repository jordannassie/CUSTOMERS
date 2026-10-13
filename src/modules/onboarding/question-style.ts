// How a question reads (step 2 of the question review, 2026-10-13): the place as a person writes it, and openings
// that do not all repeat "Where can I find...". Pure.

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * "Islamabad, Islamabad Capital Territory" and "Rawalpindi, Punjab" read like an address; a person types the city.
 * A short region code stays where it tells two places apart ("Austin, TX", "Portland, OR").
 */
export function tidyPlace(question: string, city: string, region: string | null): string {
  const r = region?.trim() ?? "";
  if (!city.trim() || !r || /^[A-Z]{2,3}$/.test(r)) return question;
  return question.replace(new RegExp(`(${esc(city.trim())}),\\s*${esc(r)}\\b`, "gi"), "$1");
}

/** The first two words, lower case: "where can", "what's the", "i just". */
export function openingOf(question: string): string {
  return question.trim().toLowerCase().split(/\s+/).slice(0, 2).join(" ");
}

/** How many of the picked questions already start the same way. */
export function openingCount(picked: { template: string }[], question: string): number {
  const opening = openingOf(question);
  return picked.filter((p) => openingOf(p.template) === opening).length;
}
