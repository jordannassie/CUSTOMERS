// Short brands written in capitals ("KFC", "H&M"): matched exactly as written, no city needed. Pure.

// A short brand written as capitals, with "&" or digits between: "KFC", "BMW", "H&M", "IHOP", "A&W", "3M".
const SHORT_BRAND = /^[A-Z0-9]+(?:\s?&\s?[A-Z0-9]+)*$/;
const MAX_SHORT_BRAND = 4;

/**
 * The name when it is a short brand written in capitals or with "&" ("KFC", "H&M", "IHOP"); null otherwise. Such a
 * name written exactly that way in an answer is the brand, never a word: "kfc" in lowercase prose is not, and "Ace"
 * reads like a word whatever its case.
 */
export function shortBrand(name: string): string | null {
  const brand = name.trim();
  const letters = brand.replace(/[^A-Za-z0-9]/g, "");
  if (!letters || letters.length > MAX_SHORT_BRAND || !/[A-Z]/.test(brand) || !SHORT_BRAND.test(brand)) return null;
  return brand;
}

/** Start offsets of the brand written exactly so, same capitals, as a whole word: "KFC is" and "KFC's", not "KFCs" or "kfc". */
export function findExactBrand(text: string, brand: string): number[] {
  const escaped = brand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s/g, "\\s?");
  const re = new RegExp(`(?<![A-Za-z0-9&])${escaped}(?![A-Za-z0-9&])`, "g");
  const hits: number[] = [];
  for (let m = re.exec(text); m; m = re.exec(text)) hits.push(m.index);
  return hits;
}
