import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { isAuthUnavailable } from "@/lib/supabase/auth-errors";
import { AuthError } from "../errors";

/**
 * Whether Supabase Auth has this user's address confirmed (the admin check only; ADMIN_EMAILS is trusted only for a
 * confirmed address). Asked by user id with the service role and kept per user and address for a few minutes, so
 * admin pages no longer wait on an Auth round trip on every request (perf fix #4, 2026-11-13). A confirmed address
 * never goes back to unconfirmed, and a changed address is a new cache key. A failed lookup throws and is not kept.
 */
export async function adminEmailConfirmed(userId: string, email: string): Promise<boolean> {
  "use cache";
  const { data, error } = await createServiceClient().auth.admin.getUserById(userId);
  if (error && isAuthUnavailable(error)) throw new AuthError("unavailable", { cause: error });
  if (error || !data.user) return false;
  return !!data.user.email_confirmed_at && data.user.email?.toLowerCase() === email.toLowerCase();
}
