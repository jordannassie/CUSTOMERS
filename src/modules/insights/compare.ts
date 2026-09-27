// How a competitor's Google values compare with the business's, so Claude can see who is ahead
// without being given the numbers (D-73).
export type Compare = "more" | "fewer" | "about_same" | "unknown";
export type RatingCompare = "higher" | "lower" | "about_same" | "unknown";

export function openDays(hours: string[] | null): number | null {
  return hours ? hours.filter((line) => !/:\s*closed\s*$/i.test(line)).length : null;
}

// Review counts within 10% read as the same; open days must match exactly.
export function compareCount(theirs: number | null, yours: number | null, share = 0.1): Compare {
  if (theirs === null || yours === null) return "unknown";
  if (Math.abs(theirs - yours) <= share * Math.max(theirs, yours)) return "about_same";
  return theirs > yours ? "more" : "fewer";
}

export function compareRating(theirs: number | null, yours: number | null): RatingCompare {
  if (theirs === null || yours === null) return "unknown";
  if (Math.abs(theirs - yours) < 0.1) return "about_same";
  return theirs > yours ? "higher" : "lower";
}
