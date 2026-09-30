import { describe, expect, it } from "vitest";
import { changeEmailInput, changePasswordInput, deleteAccountInput } from "./schema";
import { authUpdateError, confirmsName, longDate, purgeDate } from "./service";

describe("confirmsName", () => {
  it("needs the exact name, forgiving only spaces", () => {
    expect(confirmsName("Blue Door Marketing", "Blue Door Marketing")).toBe(true);
    expect(confirmsName("  Blue  Door Marketing ", "Blue Door Marketing")).toBe(true);
    expect(confirmsName("blue door marketing", "Blue Door Marketing")).toBe(false);
    expect(confirmsName("Blue Door", "Blue Door Marketing")).toBe(false);
  });

  it("never matches an empty name", () => {
    expect(confirmsName("", "")).toBe(false);
    expect(confirmsName(" ", "  ")).toBe(false);
  });
});

describe("purgeDate", () => {
  it("adds the waiting period in days", () => {
    const now = new Date("2026-10-01T12:00:00Z");
    expect(purgeDate(now, 30).toISOString()).toBe("2026-10-31T12:00:00.000Z");
    expect(longDate(purgeDate(now, 30))).toBe("October 31, 2026");
  });
});

describe("inputs", () => {
  it("normalises the new email and refuses a bad one", () => {
    expect(changeEmailInput.parse({ email: "  New@Example.COM " }).email).toBe("new@example.com");
    expect(changeEmailInput.safeParse({ email: "not-an-email" }).success).toBe(false);
  });

  it("needs 8 characters for a new password and a numeric code", () => {
    expect(changePasswordInput.safeParse({ password: "short" }).success).toBe(false);
    expect(changePasswordInput.safeParse({ password: "long enough", nonce: "123456" }).success).toBe(true);
    expect(changePasswordInput.safeParse({ password: "long enough", nonce: "abc" }).success).toBe(false);
  });

  it("needs the typed name to delete an account", () => {
    expect(deleteAccountInput.safeParse({}).success).toBe(false);
  });
});

describe("authUpdateError", () => {
  it("answers known Supabase codes in plain words and falls back otherwise", () => {
    expect(authUpdateError("email_exists", "x")).toBe("Another account already uses that email.");
    expect(authUpdateError("something_new", "Try again.")).toBe("Try again.");
    expect(authUpdateError(undefined, "Try again.")).toBe("Try again.");
  });
});
