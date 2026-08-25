/**
 * Direct Score: a 0-100 transparent measure of AI search visibility, built
 * only from real, stored signals — never an arbitrary or randomized number.
 *
 * Formula (documented here as the single source of truth):
 *   - 55% mention rate: % of tracked prompts where the business was mentioned
 *   - 20% citation rate: % of results where a source citing the business's
 *     own domain was returned by the provider
 *   - 15% position quality: average of (1 / mention_position) across mentions,
 *     rewarding earlier/more prominent mentions over buried ones
 *   - 10% competitive share: business mentions as a share of (business +
 *     competitor) mentions across all results, rewarding out-performing
 *     tracked competitors specifically
 *
 * Each weighted component is computed from visibility_results for a single
 * run (or a rolling window of runs) and combined, then rounded to an
 * integer 0-100.
 */

export interface DirectScoreInputResult {
  business_mentioned: boolean;
  mention_position: number | null;
  cited_sources: Array<{ url: string }>;
  competitors_mentioned: Array<{ name: string }>;
}

export interface DirectScoreBreakdown {
  score: number;
  mentionRate: number;
  citationRate: number;
  promptsWon: number;
  promptsTested: number;
  competitorShare: number;
}

export function calculateDirectScore(
  results: DirectScoreInputResult[],
  businessDomain: string | null,
): DirectScoreBreakdown {
  const promptsTested = results.length;
  if (promptsTested === 0) {
    return { score: 0, mentionRate: 0, citationRate: 0, promptsWon: 0, promptsTested: 0, competitorShare: 0 };
  }

  const mentioned = results.filter((r) => r.business_mentioned);
  const promptsWon = mentioned.length;
  const mentionRate = promptsWon / promptsTested;

  const cited = businessDomain
    ? results.filter((r) => r.cited_sources.some((s) => s.url.includes(businessDomain)))
    : [];
  const citationRate = promptsTested > 0 ? cited.length / promptsTested : 0;

  const positionScores = mentioned
    .map((r) => (r.mention_position && r.mention_position > 0 ? 1 / r.mention_position : 0))
    .filter((v) => v > 0);
  const positionQuality =
    positionScores.length > 0 ? positionScores.reduce((a, b) => a + b, 0) / positionScores.length : 0;

  const totalCompetitorMentions = results.reduce((sum, r) => sum + r.competitors_mentioned.length, 0);
  const competitorShare =
    promptsWon + totalCompetitorMentions > 0 ? promptsWon / (promptsWon + totalCompetitorMentions) : 0;

  const score =
    mentionRate * 0.55 * 100 +
    citationRate * 0.2 * 100 +
    positionQuality * 0.15 * 100 +
    competitorShare * 0.1 * 100;

  return {
    score: Math.round(Math.min(100, Math.max(0, score))),
    mentionRate,
    citationRate,
    promptsWon,
    promptsTested,
    competitorShare,
  };
}
