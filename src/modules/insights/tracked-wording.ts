// The writer sometimes calls the questions we check "sample questions" ("named in all 6 of the sample questions we
// tracked"), which reads as if they were picked at random. They are the questions we track (2026-10-16). Pure.

const PATTERNS: [RegExp, string][] = [
  // "the sample questions we tracked", "6 sample questions we checked": one phrase, said once.
  [/\bsample questions (?:we|that we) (?:tracked|track|checked|check|ran|asked)\b/gi, "questions we track"],
  [/\bsample question (?:we|that we) (?:tracked|track|checked|check|ran|asked)\b/gi, "question we track"],
  [/\bsample questions\b/gi, "questions we track"],
  [/\bsample question\b/gi, "question we track"],
];

/** Says "questions we track" wherever the text says "sample questions", keeping a capital at the start. */
export function trackedWording(text: string): string {
  let out = text;
  for (const [pattern, replacement] of PATTERNS) {
    out = out.replace(pattern, (match) => (match[0] === match[0].toUpperCase() ? replacement[0].toUpperCase() + replacement.slice(1) : replacement));
  }
  return out;
}
