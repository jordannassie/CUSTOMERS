// Where in its answer AI named the business (D-63): the list item, stored with every check, never shown as a rank or
// used in the score. Shown only with SHOW_POSITION, as "named 2nd" per question and an average place. Pure.

export type Place = {
  /** At least one AI named the business in this scan. */
  named: boolean;
  /** The list item each AI named it at, smallest first; empty when it was named outside a list. */
  positions: number[];
};

export type AveragePlace = { value: number; answers: number };

type PlacedCheck = { named: boolean; position?: number | null };

/** The place of one question at one scan, from its checks; null when it was not asked. */
export function placeOf(checks: PlacedCheck[]): Place | null {
  if (checks.length === 0) return null;
  const named = checks.filter((c) => c.named);
  const positions = [...new Set(named.flatMap((c) => (c.position && c.position > 0 ? [c.position] : [])))].sort((a, b) => a - b);
  return { named: named.length > 0, positions };
}

/** The average list item over answers that named the business in a list, one decimal; null when there are none. */
export function averagePlace(checks: PlacedCheck[]): AveragePlace | null {
  const positions = checks.flatMap((c) => (c.named && c.position && c.position > 0 ? [c.position] : []));
  if (positions.length === 0) return null;
  const mean = positions.reduce((a, b) => a + b, 0) / positions.length;
  return { value: Math.round(mean * 10) / 10, answers: positions.length };
}

export function ordinal(n: number): string {
  const tens = n % 100;
  if (tens >= 11 && tens <= 13) return `${n}th`;
  return `${n}${({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[n % 10] ?? "th"}`;
}

/** "named 2nd", "named 1st and 3rd", "named, not in a list", "not named". */
export function placeText(place: Place): string {
  if (!place.named) return "not named";
  if (place.positions.length === 0) return "named, not in a list";
  const places = place.positions.map(ordinal);
  return `named ${places.length === 1 ? places[0] : `${places.slice(0, -1).join(", ")} and ${places.at(-1)}`}`;
}
