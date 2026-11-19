import { describe, expect, it } from "vitest";
import { PASSWORD_MAX, passwordError } from "./password-rules";

describe("passwordError (owner, 2026-11-18)", () => {
  it("accepts a strong password", () => {
    expect(passwordError("Coffee#2026")).toBeNull();
    expect(passwordError("Ab1!efgh")).toBeNull();
  });
  it("says everything a weak password still needs, in one sentence", () => {
    expect(passwordError("password")).toBe("Your password needs an uppercase letter, a number and a symbol, like ! or #.");
    expect(passwordError("12345678")).toBe("Your password needs an uppercase letter, a lowercase letter and a symbol, like ! or #.");
    expect(passwordError("Ab1!")).toBe("Your password needs at least 8 characters.");
    expect(passwordError("")).toBe("Your password needs at least 8 characters, an uppercase letter, a lowercase letter, a number and a symbol, like ! or #.");
  });
  it("counts a space or any non-letter, non-digit as a symbol, and refuses over the Supabase limit", () => {
    expect(passwordError("Coffee 2026")).toBeNull();
    expect(passwordError(`Aa1!${"x".repeat(PASSWORD_MAX)}`)).toBe(`Use at most ${PASSWORD_MAX} characters.`);
  });
});
