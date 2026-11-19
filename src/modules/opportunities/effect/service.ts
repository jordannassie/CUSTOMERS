// "We will measure the effect" on a done action (B-98, redesign brief 5). After an action is marked done, the next
// scans are compared with the 30 days before it: how often AI named the business, from the same counted answers the
// score uses. It says what changed since, never that the action caused it. Pure.

/** Scans to wait for after the done date before showing a change. */
export const SCANS_TO_MEASURE = 2;
/** How far back "before" reaches, and how long "after" keeps counting (the brief's "over the next 30 days"). */
export const EFFECT_WINDOW_DAYS = 30;
const DAY_MS = 86_400_000;

export type EffectCheck = { checkedAt: Date; mentioned: boolean; answerKey: string };
export type Share = { named: number; total: number };

export type ActionEffect =
  | { state: "waiting"; scansSince: number; scansNeeded: number }
  | { state: "measured"; before: Share | null; after: Share; change: "up" | "down" | "same" };

/** Named answers over all answers, each answer key once (a reused answer counts once, as in the score). */
function shareOf(checks: EffectCheck[]): Share {
  const byKey = new Map<string, boolean>();
  for (const c of checks) byKey.set(c.answerKey, (byKey.get(c.answerKey) ?? false) || c.mentioned);
  return { named: [...byKey.values()].filter(Boolean).length, total: byKey.size };
}

const rate = (s: Share) => (s.total === 0 ? 0 : s.named / s.total);

/**
 * The effect of one action done at `doneAt`, from the business's counted answers around it. `scansFinished`: when each
 * of the business's scans finished (visibility_runs), so two scans minutes apart still count as two.
 */
export function measureEffect(doneAt: Date, checks: EffectCheck[], scansFinished: Date[], now: Date): ActionEffect {
  const done = doneAt.getTime();
  const end = Math.min(now.getTime(), done + EFFECT_WINDOW_DAYS * DAY_MS);
  const inWindow = (t: number) => t > done && t <= end;
  const after = checks.filter((c) => inWindow(c.checkedAt.getTime()));
  const scansSince = scansFinished.filter((t) => inWindow(t.getTime())).length;
  if (scansSince < SCANS_TO_MEASURE) return { state: "waiting", scansSince, scansNeeded: SCANS_TO_MEASURE };

  const beforeChecks = checks.filter((c) => c.checkedAt.getTime() <= done && c.checkedAt.getTime() > done - EFFECT_WINDOW_DAYS * DAY_MS);
  const afterShare = shareOf(after);
  const before = beforeChecks.length > 0 ? shareOf(beforeChecks) : null;
  // Compared as shares of answers, because the two windows can hold different numbers of answers.
  const change = !before ? "same" : rate(afterShare) > rate(before) ? "up" : rate(afterShare) < rate(before) ? "down" : "same";
  return { state: "measured", before, after: afterShare, change };
}

/** The earliest moment any of these done dates needs answers from (its "before" window), or null with none. */
export function effectReadFrom(doneDates: Date[]): Date | null {
  if (doneDates.length === 0) return null;
  const first = Math.min(...doneDates.map((d) => d.getTime()));
  return new Date(first - EFFECT_WINDOW_DAYS * DAY_MS);
}
