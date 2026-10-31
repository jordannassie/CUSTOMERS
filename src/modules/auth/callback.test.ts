import { describe, expect, it } from "vitest";
import { callbackFailurePath, callbackFlow, loginNotice } from "./callback";

const params = (query: string) => new URLSearchParams(query);

describe("callbackFlow", () => {
  it("tells the links apart from a Google sign-in", () => {
    expect(callbackFlow(params("from=signup&next=%2Fonboarding"))).toBe("signup");
    expect(callbackFlow(params("token_hash=x&type=signup"))).toBe("signup");
    expect(callbackFlow(params("code=x&next=%2Freset-password"))).toBe("recovery");
    expect(callbackFlow(params("token_hash=x&type=recovery"))).toBe("recovery");
    expect(callbackFlow(params("code=x&next=%2Fsettings%23account"))).toBe("email_change");
    expect(callbackFlow(params("token_hash=x&type=email_change"))).toBe("email_change");
    expect(callbackFlow(params("code=x&next=%2Fdashboard"))).toBe("oauth");
    // A Google sign-in started from a protected Settings page is still a Google sign-in.
    expect(callbackFlow(params("code=x&next=%2Fsettings"))).toBe("oauth");
  });
});

describe("callbackFailurePath", () => {
  it("never says the email is confirmed when a signup token did not verify", () => {
    const p = params("from=signup&token_hash=x&type=signup");
    expect(callbackFailurePath("signup", "exchange", p, false)).toBe("/login?error=signup_link_invalid");
    expect(callbackFailurePath("signup", "provider", params("from=signup&error=access_denied&error_code=otp_expired"))).toBe(
      "/login?error=signup_link_invalid",
    );
  });

  it("says the email is confirmed when a signup code fails in another browser", () => {
    expect(callbackFailurePath("signup", "exchange", params("from=signup&code=x"), true)).toBe("/login?error=signup_confirmed");
  });

  it("gives reset and email change links their own messages", () => {
    expect(callbackFailurePath("recovery", "exchange", params("code=x"), true)).toBe("/login?error=reset_link_invalid");
    expect(callbackFailurePath("recovery", "provider", params("error=access_denied&error_code=otp_expired"))).toBe(
      "/login?error=reset_link_invalid",
    );
    expect(callbackFailurePath("email_change", "exchange", params("code=x"), true)).toBe("/settings?email_link=invalid#account");
  });

  it("says a cancelled Google sign-in was cancelled", () => {
    expect(callbackFailurePath("oauth", "provider", params("error=access_denied"))).toBe("/login?error=oauth_cancelled");
    expect(callbackFailurePath("oauth", "provider", params("error=server_error&error_code=unexpected_failure"))).toBe(
      "/login?error=oauth_provider_error",
    );
    expect(callbackFailurePath("oauth", "missing", params(""))).toBe("/login?error=missing_oauth_code");
    expect(callbackFailurePath("oauth", "exchange", params("code=x"), true)).toBe("/login?error=oauth_callback_failed");
  });
});

describe("loginNotice", () => {
  it("words each failure without blaming Google for a link", () => {
    expect(loginNotice("oauth_cancelled")).toMatchObject({ kind: "message", text: expect.stringContaining("canceled") });
    expect(loginNotice("reset_link_invalid")).toMatchObject({ kind: "message", link: { href: "/forgot-password" } });
    expect(loginNotice("oauth_callback_failed")).toMatchObject({ kind: "google", text: expect.stringContaining("Google signed you in") });
    const provider = loginNotice("oauth_provider_error");
    expect(provider).toMatchObject({ kind: "google" });
    expect(provider?.text).not.toContain("signed you in");
  });

  it("shows nothing for no error or an unknown one", () => {
    expect(loginNotice(undefined)).toBeNull();
    expect(loginNotice("")).toBeNull();
    expect(loginNotice("something_else")).toBeNull();
  });
});
