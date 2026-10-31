import { AuthUnknownError, isAuthApiError, isAuthRefreshDiscardedError, isAuthRetryableFetchError } from "@supabase/supabase-js";

/**
 * True when the auth server could not answer (network, timeout, 5xx, rate limit), as opposed to answering that
 * there is no valid session. A slow backend must never be read as "signed out" (E2E-0929 BUG-4, BUG-5).
 */
export function isAuthUnavailable(error: unknown): boolean {
  if (isAuthRetryableFetchError(error) || isAuthRefreshDiscardedError(error) || error instanceof AuthUnknownError) return true;
  if (isAuthApiError(error)) return error.status === 0 || error.status === 408 || error.status === 429 || error.status >= 500;
  return false;
}
