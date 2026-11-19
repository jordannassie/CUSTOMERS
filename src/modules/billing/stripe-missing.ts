// Stripe answers "No such subscription" (404, resource_missing) for an id it does not have: one deleted in the
// Stripe dashboard, a sandbox that was reset, or a value typed into the database by hand (2026-10-14:
// "sub_local_sim_abdul"). Stripe itself was reached, so it is not an outage: there is nothing there to end or show.

/** True when Stripe said the object does not exist, not that Stripe could not be reached. */
export function isMissingInStripe(error: unknown): boolean {
  const e = error as { code?: string; statusCode?: number; raw?: { code?: string } } | null;
  return e?.code === "resource_missing" || e?.raw?.code === "resource_missing" || e?.statusCode === 404;
}

/**
 * True when Stripe says the object exists in the other mode: a test key looking up a live object, or the reverse.
 * The preview runs on test keys against a database shared with live (D-43), so a live customer's plan reads as
 * "missing" there. Never end or replace a plan on that answer (QA 2026-11-01).
 */
export function isOtherStripeMode(error: unknown): boolean {
  const e = error as { message?: string; raw?: { message?: string } } | null;
  return /similar object exists in (?:live|test) mode/i.test(`${e?.message ?? ""} ${e?.raw?.message ?? ""}`);
}
