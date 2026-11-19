import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/browser", () => ({ createClient: vi.fn(), googleSignInEnabled: vi.fn() }));
const { loginFailure, signupFailure } = await import("./auth-flow");

// The wording moved out of AuthForm unchanged (2026-11-16); e2e auth specs read the same text.
describe("sign-up failures", () => {
  it("says the email is taken and marks the email field", () => {
    expect(signupFailure("User already registered")).toEqual({ error: "An account with this email already exists. Try logging in instead.", invalid: "email" });
  });
  it("puts a password problem under the password field", () => {
    expect(signupFailure("Password should be at least 8 characters")).toEqual({
      passwordError: "Use at least 8 characters, with an uppercase letter, a lowercase letter, a number and a symbol.",
    });
    expect(signupFailure("Password is known to be weak and easy to guess, please choose a different one.")).toEqual({
      passwordError: "That password has shown up in data leaks, so it isn't safe. Choose a different one.",
    });
  });
  it("says when the confirmation email could not be sent or sign-ups are rate limited (2026-11-19)", () => {
    const notSent = { error: "We couldn't send your confirmation email. Try again later, or contact support." };
    expect(signupFailure("Error sending confirmation email")).toEqual(notSent);
    expect(signupFailure('Email address "a@b.com" cannot be used as it is not authorized', "email_address_not_authorized")).toEqual(notSent);
    const tooMany = { error: "Too many sign-ups just now. Wait a few minutes, then try again." };
    expect(signupFailure("email rate limit exceeded", "over_email_send_rate_limit")).toEqual(tooMany);
    expect(signupFailure("For security purposes, you can only request this after 42 seconds.")).toEqual(tooMany);
  });
  it("marks an email Supabase calls invalid, and says when sign-up is closed", () => {
    expect(signupFailure('Email address "x@y" is invalid', "email_address_invalid")).toEqual({ error: "Enter a valid email address.", invalid: "email" });
    expect(signupFailure("Signups not allowed for this instance", "signup_disabled")).toEqual({ error: "Sign up is closed right now. Contact support." });
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
