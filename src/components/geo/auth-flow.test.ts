import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/browser", () => ({ createClient: vi.fn(), googleSignInEnabled: vi.fn() }));
const { loginFailure, signupFailure } = await import("./auth-flow");

// The wording moved out of AuthForm unchanged (2026-11-16); e2e auth specs read the same text.
describe("sign-up failures", () => {
  it("says the email is taken and marks the email field", () => {
    expect(signupFailure("User already registered")).toEqual({ error: "An account with this email already exists. Try logging in instead.", invalid: "email" });
  });
  it("puts a password problem under the password field", () => {
    expect(signupFailure("Password should be at least 8 characters")).toEqual({ passwordError: "Password must be at least 8 characters." });
  });
  it("falls back to a general message", () => {
    expect(signupFailure("network down")).toEqual({ error: "We couldn't create your account. Try again." });
  });
});

describe("login failures", () => {
  it("asks for email confirmation before calling it a wrong password", () => {
    expect(loginFailure("email_not_confirmed", "Email not confirmed")).toEqual({ error: "Confirm your email first. Open the link we sent you, then log in.", invalid: "email" });
  });
  it("says email or password is incorrect for bad credentials", () => {
    expect(loginFailure(undefined, "Invalid login credentials")).toEqual({ error: "Email or password is incorrect.", invalid: "both" });
  });
  it("falls back to a general message", () => {
    expect(loginFailure(undefined, "timeout")).toEqual({ error: "We couldn't log you in. Try again." });
  });
});
