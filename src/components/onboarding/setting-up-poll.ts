// How often "Setting up your account" asks whether the trial has started (B-42). Pure, so it is tested on its own.

export const POLL_MS = 2000;
// Linking and the trial credits take a few seconds; after this the screen stops spinning and says what to do.
export const STILL_SETTING_UP_MS = 30_000;
/** After the "still setting up" notice, it asks far less often: the webhook may be minutes late, or never come. */
export const LATE_POLL_MS = 15_000;
/** Then it stops: the notice already says to refresh or contact us, and asking forever cost a request every 2s. */
export const STOP_POLLING_MS = 10 * 60_000;

/** Milliseconds until the next check, or null to stop checking. `elapsed` is the time since the screen opened. */
export function nextPollDelay(elapsed: number): number | null {
  if (elapsed >= STOP_POLLING_MS) return null;
  return elapsed > STILL_SETTING_UP_MS ? LATE_POLL_MS : POLL_MS;
}
