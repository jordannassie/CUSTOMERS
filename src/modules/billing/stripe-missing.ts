// Stripe answers "No such subscription" (404, resource_missing) for an id it does not have: one deleted in the
// Stripe dashboard, a sandbox that was reset, or a value typed into the database by hand (2026-10-14:
// "sub_local_sim_abdul"). Stripe itself was reached, so it is not an outage: there is nothing there to end or show.

/** True when Stripe said the object does not exist, not that Stripe could not be reached. */
export function isMissingInStripe(error: unknown): boolean {
  const e = error as { code?: string; statusCode?: number; raw?: { code?: string } } | null;
  return e?.code === "resource_missing" || e?.raw?.code === "resource_missing" || e?.statusCode === 404;
}
