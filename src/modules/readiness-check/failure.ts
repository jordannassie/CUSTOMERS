// Why a site could not be checked (BUG-096). "blocked": it answered, but turned automated readers away (adidas.com
// answers 403), so AI tools may be turned away too. "unreachable": no answer at all (DNS, timeout, server error).
export type SiteFailure = "blocked" | "unreachable";

const BLOCKED_STATUS = new Set([401, 403, 429, 503]);
// Bot challenge pages that answer 200 instead of an error.
const CHALLENGE = /<title>\s*(?:just a moment|attention required|access denied|security check)|cf-browser-verification|challenge-platform|captcha-delivery/i;

/** Null when the page can be read. */
export function failureOf(status: number, text: string): SiteFailure | null {
  if (BLOCKED_STATUS.has(status)) return "blocked";
  if (status < 200 || status >= 300 || !text) return "unreachable";
  return CHALLENGE.test(text.slice(0, 20_000)) ? "blocked" : null;
}
