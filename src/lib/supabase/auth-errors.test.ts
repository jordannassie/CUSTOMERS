import { AuthApiError, AuthInvalidJwtError, AuthRetryableFetchError, AuthSessionMissingError, AuthUnknownError } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { isAuthUnavailable } from "./auth-errors";

describe("isAuthUnavailable (E2E-0929)", () => {
  it("is true when the auth server could not answer", () => {
    expect(isAuthUnavailable(new AuthRetryableFetchError("fetch failed", 0))).toBe(true);
    expect(isAuthUnavailable(new AuthRetryableFetchError("HTTP 504", 504))).toBe(true);
    expect(isAuthUnavailable(new AuthUnknownError("not json", null))).toBe(true);
    expect(isAuthUnavailable(new AuthApiError("too many requests", 429, "over_request_rate_limit"))).toBe(true);
    expect(isAuthUnavailable(new AuthApiError("server error", 500, undefined))).toBe(true);
  });

  it("is false when there is no valid session, so the user still goes to log in", () => {
    expect(isAuthUnavailable(null)).toBe(false);
    expect(isAuthUnavailable(new AuthSessionMissingError())).toBe(false);
    expect(isAuthUnavailable(new AuthApiError("invalid JWT", 401, "bad_jwt"))).toBe(false);
    expect(isAuthUnavailable(new AuthApiError("refresh token not found", 400, "refresh_token_not_found"))).toBe(false);
    expect(isAuthUnavailable(new AuthApiError("user not found", 403, "user_not_found"))).toBe(false);
    expect(isAuthUnavailable(new AuthInvalidJwtError("bad signature"))).toBe(false);
  });
});
