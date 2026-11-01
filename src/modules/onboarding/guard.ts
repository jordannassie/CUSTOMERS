import "server-only";
import { AuthError, getCurrentAgency, isAgencyPaused, requireUser, type ActionResult, type SessionUser } from "@/modules/auth";
import { checkRateLimit } from "@/modules/rate-limit";

// Setup's own checks. Its actions run before the agency exists, so they cannot use requireAgency(); these refuse a
// suspended or deleted agency the same way, and cap how often one user can run auto-fill, which pays for AI and Places.

/** The signed-in user, unless their agency is suspended or deleted. Throws AuthError, like requireUser(). */
export async function activeUser(): Promise<SessionUser> {
  const user = await requireUser();
  const agency = await getCurrentAgency();
  if (agency && isAgencyPaused(agency.status)) throw new AuthError(agency.status === "deleted" ? "agency_deleted" : "agency_paused");
  return user;
}

/** Null when this user may run auto-fill now, else the refusal to return. Per user (SEC-07). */
export async function autofillLimit(userId: string): Promise<ActionResult<never> | null> {
  const limit = await checkRateLimit("autofill", userId);
  if (limit === "limited") return { ok: false, status: 429, error: "You've looked up a lot of businesses this hour. Try again later." };
  if (limit === "unavailable") return { ok: false, status: 503, error: "We couldn't look up your business just now. Try again in a few minutes." };
  return null;
}

/** Null when this user may look up another competitor on Google now, else the refusal to return. Per user. */
export async function competitorLookupLimit(userId: string): Promise<ActionResult<never> | null> {
  const limit = await checkRateLimit("competitor_lookup", userId);
  if (limit === "limited") return { ok: false, status: 429, error: "You've looked up a lot of competitors this hour. Try again later." };
  if (limit === "unavailable") return { ok: false, status: 503, error: "We couldn't look up competitors just now. Try again in a few minutes." };
  return null;
}
