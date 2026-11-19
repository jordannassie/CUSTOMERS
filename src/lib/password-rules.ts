// The password rule (owner, 2026-11-18: "any easy password" was accepted, only 8 characters were checked). One rule for
// sign up, reset and change password, in the browser and on the server. Supabase Auth's own "Password requirements"
// setting must match it on each project, since sign up and reset talk to Supabase from the browser. Pure.

export const PASSWORD_MIN = 8;
/** Supabase (bcrypt) reads at most 72 bytes; longer passwords are refused rather than cut. */
export const PASSWORD_MAX = 72;

export type PasswordRule = { id: "length" | "upper" | "lower" | "number" | "symbol"; label: string; need: string; test: (p: string) => boolean };

export const PASSWORD_RULES: PasswordRule[] = [
  { id: "length", label: `At least ${PASSWORD_MIN} characters`, need: `at least ${PASSWORD_MIN} characters`, test: (p) => p.length >= PASSWORD_MIN },
  { id: "upper", label: "An uppercase letter", need: "an uppercase letter", test: (p) => /[A-Z]/.test(p) },
  { id: "lower", label: "A lowercase letter", need: "a lowercase letter", test: (p) => /[a-z]/.test(p) },
  { id: "number", label: "A number", need: "a number", test: (p) => /[0-9]/.test(p) },
  { id: "symbol", label: "A symbol, like ! or #", need: "a symbol, like ! or #", test: (p) => /[^A-Za-z0-9]/.test(p) },
];

const list = (items: string[]) => (items.length < 2 ? (items[0] ?? "") : `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`);

/** What the password still needs, as one sentence; null when it meets the rule. */
export function passwordError(password: string): string | null {
  if (password.length > PASSWORD_MAX) return `Use at most ${PASSWORD_MAX} characters.`;
  const missing = PASSWORD_RULES.filter((r) => !r.test(password)).map((r) => r.need);
  return missing.length === 0 ? null : `Your password needs ${list(missing)}.`;
}
