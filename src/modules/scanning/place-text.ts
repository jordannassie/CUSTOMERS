import { findPhrase, normaliseText } from "./mention-text";

/**
 * Where a place (a city, a branch's street or area) is named in the text, also as "Islamabad's": apostrophes are
 * dropped when matching, so that reads "islamabads" and findPhrase alone missed it (BUG-146).
 */
export function findPlace(text: string, place: string): number[] {
  const phrase = normaliseText(place);
  if (!phrase) return [];
  return [...new Set([...findPhrase(text, phrase), ...findPhrase(text, `${phrase}s`)])].sort((a, b) => a - b);
}
