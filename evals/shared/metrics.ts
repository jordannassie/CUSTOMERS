// Scores from the MVP_SPEC 25 suite table, shared by the code graders.

export type Labelled = { expected: boolean; predicted: boolean };

// Mention detection: false positives are reported apart from accuracy.
export function accuracy(cases: Labelled[]) {
  const correct = cases.filter((c) => c.expected === c.predicted).length;
  return {
    total: cases.length,
    accuracy: cases.length ? correct / cases.length : 0,
    falsePositives: cases.filter((c) => c.predicted && !c.expected).length,
    falseNegatives: cases.filter((c) => !c.predicted && c.expected).length,
  };
}

const normalise = (names: string[]) => new Set(names.map((n) => n.trim().toLowerCase()).filter(Boolean));

// "Also recommended" extraction: F1 over the set of business names.
export function setF1(expected: string[], predicted: string[]): number {
  const want = normalise(expected);
  const got = normalise(predicted);
  if (want.size === 0 && got.size === 0) return 1;
  const hits = [...got].filter((name) => want.has(name)).length;
  if (hits === 0) return 0;
  const precision = hits / got.size;
  const recall = hits / want.size;
  return (2 * precision * recall) / (precision + recall);
}

// Question picking: share of picked questions that a person marked acceptable.
export function overlap(picked: string[], acceptablePool: string[]): number {
  const pool = normalise(acceptablePool);
  const chosen = normalise(picked);
  if (chosen.size === 0) return 0;
  return [...chosen].filter((q) => pool.has(q)).length / chosen.size;
}
